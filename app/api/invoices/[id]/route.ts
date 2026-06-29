import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// GET /api/invoices/[id] — get single invoice
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, user: { clerkId: userId } },
  });

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  return NextResponse.json(invoice);
}

// PATCH /api/invoices/[id] — update invoice
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.invoice.findFirst({
    where: { id, user: { clerkId: userId } },
  });
  if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: body.status ?? existing.status,
      clientName: body.clientName ?? existing.clientName,
      clientEmail: body.clientEmail ?? existing.clientEmail,
      dueDate: body.dueDate ? new Date(body.dueDate) : existing.dueDate,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      pdfUrl: body.pdfUrl !== undefined ? body.pdfUrl : existing.pdfUrl,
      stripePaymentLink: body.stripePaymentLink !== undefined ? body.stripePaymentLink : existing.stripePaymentLink,
      stripePaymentLinkId: body.stripePaymentLinkId !== undefined ? body.stripePaymentLinkId : existing.stripePaymentLinkId,
    },
  });

  return NextResponse.json(invoice);
}

// DELETE /api/invoices/[id] — delete invoice
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.invoice.findFirst({
    where: { id, user: { clerkId: userId } },
  });
  if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// POST /api/invoices/[id]/pay — create Stripe payment link
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const { id } = await params;
  const url = new URL(req.url);

  // Handle /pay subroute
  if (!url.pathname.endsWith("/pay")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = await prisma.invoice.findFirst({
    where: { id, user: { clerkId: userId } },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  try {
    // Create a Stripe payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Invoice ${invoice.invoiceNumber} - ${invoice.clientName}`,
              description: `Payment for ${invoice.invoiceNumber}`,
            },
            unit_amount: invoice.amount,
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: "redirect",
        redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices/${invoice.id}?paid=true` },
      },
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
    });

    // Update invoice with payment link
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        stripePaymentLink: paymentLink.url,
        stripePaymentLinkId: paymentLink.id,
        status: "sent",
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error creating payment link:", error);
    return NextResponse.json({ error: error.message || "Failed to create payment link" }, { status: 500 });
  }
}