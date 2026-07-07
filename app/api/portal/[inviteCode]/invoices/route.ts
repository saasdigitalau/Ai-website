import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/portal/[inviteCode]/invoices - Get invoices for this client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await params;

  const client = await prisma.client.findUnique({
    where: { inviteCode },
    select: { id: true, email: true, userId: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  // Find invoices belonging to this client (matched by email)
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: client.userId,
      clientEmail: client.email,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      clientName: true,
      amount: true,
      status: true,
      dueDate: true,
      notes: true,
      lineItems: true,
      stripePaymentLink: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ invoices });
}