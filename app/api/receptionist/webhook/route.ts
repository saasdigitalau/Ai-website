import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import {
  EMAIL_EVENT,
  STORED_EVENTS,
  isWebhookSecretConfigured,
  parseCallEvent,
  verifyRetellSignature,
  type RetellWebhookEvent,
} from "@/lib/receptionist";

// ---------------------------------------------------------------------------
// POST /api/receptionist/webhook — Retell's post-call webhook.
//
// This is the only way a call reaches the app. The raw body is verified against
// the `x-retell-signature` header with RETELL_WEBHOOK_SECRET before a single
// field is read from it: HMAC-SHA256 over (body + timestamp), timestamp within
// five minutes. Unsigned, wrongly signed, malformed or stale deliveries get 401
// and write nothing. With no secret configured the route answers 503
// not_connected — an explicit state, not a crash, and never an open door.
//
// A verified delivery is stored as one CallEnquiry per call_id (upsert), so
// Retell's call_ended → call_analyzed pair and its three retries collapse into
// a single row instead of a pile of duplicates. The caller's details are taken
// from the agent's post-call analysis (docs/receptionist-agent-prompt.md); a
// field the analysis did not capture stays null.
//
// The account owner is emailed once, on call_analyzed, because that is the
// delivery that carries the caller's name and reason. No owner on the payload →
// the call is still stored, marked no_owner, and nobody is emailed. No
// RESEND_API_KEY → stored and marked not_configured rather than pretending mail
// went out.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

function isStoredEvent(event: string | undefined): boolean {
  return Boolean(event) && (STORED_EVENTS as readonly string[]).includes(event as string);
}

function enquiryEmail(call: {
  callerName: string | null;
  callerNumber: string | null;
  fromNumber: string | null;
  reason: string | null;
  summary: string | null;
  startedAt: Date | null;
  durationSeconds: number | null;
}) {
  const who = call.callerName || call.fromNumber || "a caller";
  const number = call.callerNumber || call.fromNumber || "not given";
  const reason = call.reason || call.summary || "not captured";

  const when = call.startedAt
    ? call.startedAt.toLocaleString("en-AU", { timeZone: "Australia/Sydney", dateStyle: "medium", timeStyle: "short" })
    : "time not recorded";

  const lines = [
    `Someone called your business and the receptionist took their details.`,
    ``,
    `Name:   ${call.callerName || "not given"}`,
    `Number: ${number}`,
    `Reason: ${reason}`,
    `When:   ${when}${call.durationSeconds !== null ? ` (${call.durationSeconds}s)` : ""}`,
    ``,
    `Open the receptionist page in your dashboard to see the full transcript.`,
  ];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (appUrl) lines.push(``, `${appUrl}/dashboard/receptionist`);

  return {
    subject: `New call enquiry from ${who}`,
    text: lines.join("\n"),
    html: `<p>Someone called your business and the receptionist took their details.</p>
<ul>
  <li><strong>Name:</strong> ${call.callerName || "not given"}</li>
  <li><strong>Number:</strong> ${number}</li>
  <li><strong>Reason:</strong> ${reason}</li>
  <li><strong>When:</strong> ${when}${call.durationSeconds !== null ? ` (${call.durationSeconds}s)` : ""}</li>
</ul>
${appUrl ? `<p><a href="${appUrl}/dashboard/receptionist">Open the receptionist page</a></p>` : ""}`,
  };
}

export async function POST(req: NextRequest) {
  if (!isWebhookSecretConfigured()) {
    return NextResponse.json(
      { connected: false, provider: "retell", error: "Webhook secret is not configured" },
      { status: 503 }
    );
  }

  // The signature is computed over the raw bytes: read the body as text and
  // never re-serialise it before verifying.
  const rawBody = await req.text();
  const signature = req.headers.get("x-retell-signature") ?? req.headers.get("X-Retell-Signature");

  if (!verifyRetellSignature(rawBody, signature)) {
    return NextResponse.json(
      { connected: true, provider: "retell", error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  let event: RetellWebhookEvent;
  try {
    event = JSON.parse(rawBody) as RetellWebhookEvent;
  } catch {
    return NextResponse.json(
      { connected: true, provider: "retell", error: "Malformed webhook payload" },
      { status: 400 }
    );
  }

  if (!isStoredEvent(event?.event)) {
    return NextResponse.json({ received: true, event: event?.event ?? null, handled: false });
  }

  const parsed = parseCallEvent(event);
  if (!parsed) {
    return NextResponse.json(
      { connected: true, provider: "retell", error: "Payload has no call.call_id" },
      { status: 400 }
    );
  }

  // Attribute the call to an account. The agent is provisioned with that
  // account's id in its metadata (or in the dynamic variables of the call), so
  // an inbound call to that agent belongs to that account.
  const owner = parsed.ownerRef
    ? await prisma.user.findFirst({
        where: { OR: [{ id: parsed.ownerRef }, { clerkId: parsed.ownerRef }] },
        select: { id: true, email: true },
      })
    : null;

  const fields = {
    agentId: parsed.agentId,
    direction: parsed.direction,
    fromNumber: parsed.fromNumber,
    toNumber: parsed.toNumber,
    callerName: parsed.callerName,
    callerNumber: parsed.callerNumber,
    reason: parsed.reason,
    summary: parsed.summary,
    transcript: parsed.transcript,
    recordingUrl: parsed.recordingUrl,
    startedAt: parsed.startedAt,
    endedAt: parsed.endedAt,
    durationSeconds: parsed.durationSeconds,
    lastEvent: event.event ?? null,
  };

  const existing = await prisma.callEnquiry.findUnique({
    where: { callId: parsed.callId },
    select: { id: true, userId: true, emailStatus: true },
  });

  // call_ended usually arrives before call_analyzed, so an update must never
  // blank a field the other delivery filled in: nulls are dropped and only
  // what this payload actually carries is written.
  const update: Prisma.CallEnquiryUncheckedUpdateInput = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== null && value !== undefined)
  ) as Prisma.CallEnquiryUncheckedUpdateInput;

  // A call that could not be attributed at first can be attributed later.
  if (owner && !existing?.userId) update.userId = owner.id;
  if (owner && existing?.emailStatus === "no_owner") update.emailStatus = "pending";
  if (event.event === EMAIL_EVENT) update.rawPayload = event as unknown as Prisma.InputJsonValue;

  const row = await prisma.callEnquiry.upsert({
    where: { callId: parsed.callId },
    create: {
      ...fields,
      callId: parsed.callId,
      userId: owner?.id ?? null,
      emailStatus: owner ? "pending" : "no_owner",
      rawPayload: event as unknown as Prisma.InputJsonValue,
    },
    update,
  });

  // Email the owner once per call, when the caller's details are available.
  let emailStatus = row.emailStatus;
  if (event.event === EMAIL_EVENT && emailStatus === "pending" && owner && !owner.email) {
    emailStatus = "no_owner";
    await prisma.callEnquiry.update({
      where: { id: row.id },
      data: { emailStatus, emailError: "the account has no email address" },
    });
  } else if (event.event === EMAIL_EVENT && emailStatus === "pending" && owner?.email) {
    if (!isEmailConfigured()) {
      emailStatus = "not_configured";
      await prisma.callEnquiry.update({
        where: { id: row.id },
        data: { emailStatus, emailError: "RESEND_API_KEY is not set" },
      });
    } else {
      const mail = enquiryEmail({
        callerName: row.callerName,
        callerNumber: row.callerNumber,
        fromNumber: row.fromNumber,
        reason: row.reason,
        summary: row.summary,
        startedAt: row.startedAt,
        durationSeconds: row.durationSeconds,
      });
      const sent = await sendEmail({ to: owner.email, ...mail });
      emailStatus = sent.status;
      await prisma.callEnquiry.update({
        where: { id: row.id },
        data: {
          emailStatus: sent.status,
          emailedAt: sent.status === "sent" ? new Date() : null,
          emailError: sent.error ?? null,
        },
      });
    }
  }

  return NextResponse.json({
    received: true,
    event: event.event,
    handled: true,
    enquiryId: row.id,
    ownerAttributed: Boolean(owner),
    email: emailStatus,
  });
}
