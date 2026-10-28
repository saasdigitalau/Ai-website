import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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