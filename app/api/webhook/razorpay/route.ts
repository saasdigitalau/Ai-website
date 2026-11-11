import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  RAZORPAY_CURRENCY,
  WEBHOOK_NOT_CONNECTED_MESSAGE,
  isPaidEvent,
  isRazorpayWebhookConfigured,
  verifyWebhookSignature,
  type RazorpayWebhookEvent,
} from "@/lib/razorpay";
import { applySubscriptionEvent, isSubscriptionEvent } from "@/lib/razorpay-subscriptions";

// ---------------------------------------------------------------------------
// POST /api/webhook/razorpay — the ONLY place an invoice becomes paid, and the
// only place a subscription grants a plan.
//
// The raw request body is verified against the x-razorpay-signature header with
// RAZORPAY_WEBHOOK_SECRET before anything is read from it. Then:
//
//  * payment.captured / order.paid → match the invoice whose razorpayOrderId
//    equals the payment's order_id, require the amount and AUD currency to
//    match, and flip it to paid.
//  * subscription.activated / subscription.charged / subscription.cancelled →
//    update the owning user's plan and subscriptionStatus. A paid month
//    (activated / charged) also sets the account's site credits to that tier's
//    allowance, once per paid period, in the same update — this webhook is the
//    only place credits are granted, and a cancelled subscription grants none.
//    A cancellation does NOT clear the plan: it records "cancelled" plus the
//    paid-through date, and the account keeps the plan until that date (the
//    downgrade to free is read-time, see lib/entitlements.ts).
//  * anything else verified → acknowledged with handled:false, nothing written.
//
// No secret configured → 503 not_connected (an explicit state, not a crash).
// Bad or missing signature → 400, and nothing is written.
// Unsigned "?paid=true"-style shortcuts are not possible here: there is no
// code path that writes status "paid" or grants a plan without a valid
// signature.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isRazorpayWebhookConfigured()) {
    return NextResponse.json(
      { connected: false, provider: "razorpay", error: WEBHOOK_NOT_CONNECTED_MESSAGE },
      { status: 503 }
    );
  }

  // Signature is computed over the raw bytes, so read the body as text and never
  // re-serialise it before verifying.
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-razorpay-signature") || req.headers.get("X-Razorpay-Signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { connected: true, provider: "razorpay", error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json(
      { connected: true, provider: "razorpay", error: "Malformed webhook payload" },
      { status: 400 }
    );
  }

  // Verified subscription lifecycle events: plan changes are written from here
  // and nowhere else.
  if (isSubscriptionEvent(event.event)) {
    const result = await applySubscriptionEvent(event);
    return NextResponse.json({
      received: true,
      event: event.event,
      ...result,
    });
  }

  // Verified, but not an event we act on: acknowledge and change nothing.
  if (!isPaidEvent(event.event)) {
    return NextResponse.json({ received: true, event: event.event ?? null, handled: false });
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id;
  if (!payment?.id || !orderId) {
    return NextResponse.json(
      { received: true, event: event.event, handled: false, reason: "no payment entity" },
      { status: 200 }
    );
  }

  // payment.captured implies a captured payment, but check the entity itself so
  // an authorised-but-not-captured payment can never be treated as money received.
  const captured = payment.captured === true || payment.status === "captured";
  if (!captured) {
    return NextResponse.json({
      received: true,
      event: event.event,
      handled: false,
      reason: "payment not captured",
    });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { razorpayOrderId: orderId },
  });

  if (!invoice) {
    // Unknown order — acknowledge so Razorpay stops retrying, but record it.
    console.warn(`Razorpay webhook: no invoice for order ${orderId}`);
    return NextResponse.json({ received: true, event: event.event, handled: false, reason: "unknown order" });
  }

  // Idempotent replay: the same captured payment arriving twice changes nothing.
  if (invoice.status === "paid" && invoice.razorpayPaymentId === payment.id) {
    return NextResponse.json({ received: true, event: event.event, handled: true, invoiceId: invoice.id });
  }

  const paidAmount = Number(payment.amount);
  const paidCurrency = String(payment.currency || "").toUpperCase();
  if (paidAmount !== invoice.amount || paidCurrency !== RAZORPAY_CURRENCY) {
    console.error(
      `Razorpay webhook: amount/currency mismatch for invoice ${invoice.id} ` +
        `(expected ${invoice.amount} ${RAZORPAY_CURRENCY}, got ${paidAmount} ${paidCurrency || "?"})`
    );
    return NextResponse.json(
      { connected: true, provider: "razorpay", error: "Payment amount or currency does not match the invoice" },
      { status: 400 }
    );
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "paid",
      razorpayPaymentId: payment.id,
    },
  });

  return NextResponse.json({ received: true, event: event.event, handled: true, invoiceId: invoice.id });
}
