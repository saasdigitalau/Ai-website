import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// GET /api/invoices — list invoices for current user
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: any = {
    user: { clerkId: userId },
  };
  if (status && ["pending", "sent", "paid", "overdue"].includes(status)) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { clientName: { contains: search, mode: "insensitive" } },
      { clientEmail: { contains: search, mode: "insensitive" } },
      { invoiceNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

// POST /api/invoices — create a new invoice
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { clientName, clientEmail, lineItems, dueDate, notes } = body;

    if (!clientName || !clientEmail || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: clientName, clientEmail, lineItems" },
        { status: 400 }
      );
    }

    // Calculate total amount in cents
    const amount = lineItems.reduce(
      (sum: number, item: any) => sum + Math.round((item.quantity || 1) * (item.unitPrice || 0) * 100),
      0
    );

    if (amount <= 0) {
      return NextResponse.json({ error: "Invoice total must be greater than 0" }, { status: 400 });
    }

    // Generate invoice number (INV-0001 format)
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: "desc" },
      select: { invoiceNumber: true },
    });

    let nextNum = 1;
    if (lastInvoice?.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const invoiceNumber = `INV-${String(nextNum).padStart(4, "0")}`;

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const invoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        clientName,
        clientEmail,
        amount,
        invoiceNumber,
        lineItems: JSON.parse(JSON.stringify(lineItems)),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        status: "pending",
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: error.message || "Failed to create invoice" }, { status: 500 });
  }
}