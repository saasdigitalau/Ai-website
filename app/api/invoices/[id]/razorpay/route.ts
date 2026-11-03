import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  RAZORPAY_CURRENCY,
  NOT_CONNECTED_MESSAGE,
  RazorpayNotConnectedError,
  RazorpayRequestError,
  createRazorpayOrder,
  isRazorpayConfigured,
  razorpayKeyId,
} from "@/lib/razorpay";

// ---------------------------------------------------------------------------
// POST /api/invoices/[id]/razorpay — create a Razorpay order in AUD for one of
// the signed-in user's invoices, so their client can pay it by card.
//
// GET on the same route reports whether card payments are switched on, so the
// UI can show a "not connected" state instead of a broken pay button.
//
// With no RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET saved, both methods answer a
// clear not-connected payload (503) and never touch the network or throw.
// Creating an order does NOT mark anything paid: only the signature-verified
// webhook at /api/webhook/razorpay can do that.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET() {
  return NextResponse.json({
    connected: isRazorpayConfigured(),
    provider: "razorpay",
    currency: RAZORPAY_CURRENCY,
    error: isRazorpayConfigured() ? undefined : NOT_CONNECTED_MESSAGE,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { connected: false, provider: "razorpay", currency: RAZORPAY_CURRENCY, error: NOT_CONNECTED_MESSAGE },
      { status: 503 }
    );
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, user: { clerkId: userId } },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  if (invoice.status === "paid") {
    return NextResponse.json(
      { error: "This invoice is already paid.", invoiceId: invoice.id },
      { status: 409 }
    );
  }

  if (!Number.isInteger(invoice.amount) || invoice.amount <= 0) {
    return NextResponse.json(
      { error: "Invoice amount must be greater than 0 before it can be charged." },
      { status: 400 }
    );
  }

  try {
    // Invoice.amount is stored in cents, and Razorpay takes AUD in cents, so the
    // amount passes through unchanged.
    const order = await createRazorpayOrder({
      amount: invoice.amount,
      receipt: invoice.invoiceNumber,
      notes: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientEmail: invoice.clientEmail,
      },
    });

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        razorpayOrderId: order.id,
        // An invoice that has a live payment order is out with the client, but
        // it stays unpaid until the webhook confirms a captured payment.
        status: invoice.status === "pending" ? "sent" : invoice.status,
      },
    });

    return NextResponse.json({
      connected: true,
      provider: "razorpay",
      invoiceId: updated.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency || RAZORPAY_CURRENCY,
      // The key id is public by design; the secret is never returned.
      keyId: razorpayKeyId(),
      status: updated.status,
    });
  } catch (err: any) {
    if (err instanceof RazorpayNotConnectedError) {
      return NextResponse.json(
        { connected: false, provider: "razorpay", currency: RAZORPAY_CURRENCY, error: NOT_CONNECTED_MESSAGE },
        { status: 503 }
      );
    }
    if (err instanceof RazorpayRequestError) {
      console.error("Razorpay order failed:", err.message);
      return NextResponse.json(
        { connected: true, provider: "razorpay", error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }
    console.error("Error creating Razorpay order:", err);
    return NextResponse.json(
      { connected: true, provider: "razorpay", error: "Could not create a payment order." },
      { status: 500 }
    );
  }
}
