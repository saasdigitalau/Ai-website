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
import { applyPlanPurchaseEvent } from "@/lib/razorpay-plans";

// ---------------------------------------------------------------------------
// POST /api/webhook/razorpay — the ONLY place an invoice becomes paid, and the
// only place a plan month is granted.
//
// The raw request body is verified against the x-razorpay-signature header with
// RAZORPAY_WEBHOOK_SECRET before anything is read from it. Then:
//
//  * payment.captured / order.paid on a plan order → the PlanPurchase recorded
//    at checkout is found by order id, the amount and AUD currency must match
//    the price, and the plan is granted for one month: User.plan, an "active"
//    status, the paid-through date (payment date + one month) and the tier's
//    site credits (set, never added) in one update. The month is claimed once
//    per order id, so a retried or duplicated delivery changes nothing. Nothing
//    renews: the next month is a new order.
//  * payment.captured / order.paid on an invoice order → match the invoice whose
//    razorpayOrderId equals the payment's order_id, require the amount and AUD
//    currency to match, and flip it to paid.
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

  // Verified, but not an event we act on: acknowledge and change nothing.
  if (!isPaidEvent(event.event)) {
    return NextResponse.json({ received: true, event: event.event ?? null, handled: false });
  }

  // A plan month is bought with its own order, so try that first. "unknown
  // order" means this payment is not a plan purchase, and the invoice path
  // below gets its turn.
  const planResult = await applyPlanPurchaseEvent(event);
  if (planResult.reason !== "unknown order") {
    if (planResult.mismatch) {
      return NextResponse.json(
        { connected: true, provider: "razorpay", error: planResult.reason },
        { status: 400 }
      );
    }
    return NextResponse.json({ received: true, event: event.event, ...planResult });
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
