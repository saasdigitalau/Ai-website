import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPaymentProvider, getPaymentCurrency } from "@/lib/billing";
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  RazorpayError,
} from "@/lib/razorpay";

// POST /api/invoices/[id]/pay — start a payment for an invoice.
//
// Provider-agnostic: returns a Razorpay checkout payload (order id + public
// key) when Razorpay is active, or a Stripe payment-link URL when Stripe is.
// This route NEVER marks an invoice paid — only the provider's signed webhook
// does (fail closed). The browser callback is untrusted.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, user: { clerkId: userId } },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
  }

  const provider = getPaymentProvider();

  if (provider === "razorpay") {
    const keyId = getRazorpayKeyId();
    if (!keyId) {
      return NextResponse.json(
        { error: "Payments are not configured.", configured: false, provider: "razorpay" },
        { status: 503 }
      );
    }

    try {
      const order = await createRazorpayOrder({
        amount: invoice.amount,
        currency: getPaymentCurrency(),
        receipt: invoice.invoiceNumber,
        notes: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          userId,
          kind: "invoice",
        },
      });

      // Mark "sent" so the UI reflects that a payment has been initiated, but
      // do NOT mark paid here — the webhook is the source of truth.
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: invoice.status === "overdue" ? "overdue" : "sent" },
      });

      return NextResponse.json({
        provider: "razorpay",
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        invoiceId: invoice.id,
      });
    } catch (err) {
      if (err instanceof RazorpayError) {
        return NextResponse.json(
          { error: err.message, configured: err.code !== "not_configured" },
          { status: err.status }
        );
      }
      console.error("Error creating Razorpay order:", err);
      return NextResponse.json(
        { error: "Failed to create Razorpay order" },
        { status: 500 }
      );
    }
  }

  if (provider === "stripe") {
    if (!stripe) {
      return NextResponse.json(
        { error: "Payments are not configured.", configured: false, provider: "stripe" },
        { status: 503 }
      );
    }

    try {
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            // @ts-ignore - payment link line items accept price_data at runtime
            price_data: {
              currency: getPaymentCurrency(),
              product_data: {
                name: `Invoice ${invoice.invoiceNumber} - ${invoice.clientName}`,
                description: `Payment for ${invoice.invoiceNumber}`,
              },
              unit_amount: invoice.amount,
            },
            quantity: 1,
          },
        ] as any,
        after_completion: {
          type: "redirect",
          redirect: {
            url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices/${invoice.id}?paid=true`,
          },
        },
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        },
      });

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          stripePaymentLink: paymentLink.url,
          stripePaymentLinkId: paymentLink.id,
          status: "sent",
        },
      });

      return NextResponse.json({
        provider: "stripe",
        url: paymentLink.url,
        invoiceId: invoice.id,
      });
    } catch (err: any) {
      console.error("Error creating Stripe payment link:", err);
      return NextResponse.json(
        { error: err.message || "Failed to create payment link" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Payments are not configured.", configured: false, provider: "none" },
    { status: 503 }
  );
}
