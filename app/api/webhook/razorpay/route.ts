import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchRazorpayOrder,
  getRazorpayCredentials,
  verifyRazorpayWebhookSignature,
} from "@/lib/razorpay";

// Razorpay webhook receiver. The signed webhook is the ONLY thing that marks an
// invoice paid or activates a subscription — the browser callback is never
// trusted. The handler is idempotent: a duplicate delivery of the same event
// must not double-apply, and an unverified event must not change anything.
export async function POST(req: NextRequest) {
  const creds = getRazorpayCredentials();
  const signature = req.headers.get("x-razorpay-signature");

  // Fail closed: without a configured webhook secret we cannot trust the event.
  if (!creds || !creds.webhookSecret) {
    return NextResponse.json(
      { error: "Razorpay webhook is not configured." },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  if (!verifyRazorpayWebhookSignature(rawBody, signature, creds.webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    switch (event.event) {
      case "order.paid": {
        await applyOrderPaid(event.payload?.order?.entity?.notes);
        break;
      }
      case "payment.captured": {
        // A captured payment references its order; resolve the order (read-only)
        // to read the notes that carry our invoice id or plan.
        const orderId = event.payload?.payment?.entity?.order_id;
        if (orderId) {
          const order = await fetchRazorpayOrder(orderId);
          await applyOrderPaid(order.notes);
        }
        break;
      }
      case "subscription.charged":
      case "subscription.authenticated":
      case "subscription.activated": {
        await applySubscription(event.payload?.subscription?.entity, "active");
        break;
      }
      case "subscription.paused":
      case "subscription.halted": {
        await applySubscription(event.payload?.subscription?.entity, "past_due");
        break;
      }
      case "subscription.cancelled":
      case "subscription.completed": {
        await applySubscription(event.payload?.subscription?.entity, "canceled");
        break;
      }
      default:
        // Unknown events are acknowledged so Razorpay does not retry forever.
        break;
    }
  } catch (err) {
    console.error("Razorpay webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function applyOrderPaid(notes: Record<string, any> | null | undefined) {
  if (!notes) return;

  const invoiceId = notes.invoiceId || notes.invoice_id;
  if (invoiceId) {
    // Idempotent: only flip into "paid" if it is not already paid, so a
    // duplicate delivery cannot double-apply.
    await prisma.invoice.updateMany({
      where: { id: String(invoiceId), status: { not: "paid" } },
      data: { status: "paid" },
    });
    return;
  }

  // One-time plan payment (manual-renewal path). Activate only if a valid
  // clerk id + plan were captured in the order notes.
  if (notes.kind === "plan" && notes.clerkId && notes.plan) {
    await prisma.user.updateMany({
      where: { clerkId: String(notes.clerkId) },
      data: {
        plan: String(notes.plan),
        subscriptionStatus: "active",
        aiCredits:
          notes.plan === "starter" ? 100 : notes.plan === "pro" ? 200 : notes.plan === "business" ? 500 : 0,
      },
    });
  }
}

async function applySubscription(
  entity: Record<string, any> | null | undefined,
  status: string
) {
  if (!entity) return;
  const notes = entity.notes || {};
  const clerkId = notes.clerkId || notes.clerk_id;
  const plan = notes.plan;
  if (!clerkId) return;

  const data: Record<string, any> = { subscriptionStatus: status };
  if (status === "active" && plan) {
    data.plan = plan;
    data.aiCredits =
      plan === "starter" ? 100 : plan === "pro" ? 200 : plan === "business" ? 500 : 0;
  }
  if (status === "canceled") {
    data.plan = "free";
    data.aiCredits = 0;
  }

  await prisma.user.updateMany({
    where: { clerkId: String(clerkId) },
    data,
  });
}
