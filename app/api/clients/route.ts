import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// GET /api/clients - List all clients for the authenticated user
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const clients = await prisma.client.findMany({
    where: {
      userId: dbUser.id,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: {
      website: {
        select: {
          id: true,
          name: true,
          approved: true,
          published: true,
        },
      },
      feedback: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          message: true,
          type: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalWithFeedback = clients.filter((c) => c.feedback.length > 0).length;
  const totalApproved = clients.filter((c) => c.approved).length;

  return NextResponse.json({
    clients,
    stats: {
      total: clients.length,
      totalWithFeedback,
      totalApproved,
    },
  });
}

// POST /api/clients - Create a new client invite
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, email, websiteId } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  // Check for existing client with same email
  const existing = await prisma.client.findFirst({
    where: { userId: dbUser.id, email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A client with this email already exists" },
      { status: 409 }
    );
  }

  let inviteCode = generateInviteCode();
  // Ensure uniqueness
  let codeExists = await prisma.client.findUnique({ where: { inviteCode } });
  while (codeExists) {
    inviteCode = generateInviteCode();
    codeExists = await prisma.client.findUnique({ where: { inviteCode } });
  }

  const client = await prisma.client.create({
    data: {
      userId: dbUser.id,
      name,
      email,
      inviteCode,
      websiteId: websiteId || null,
    },
    include: {
      website: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ client }, { status: 201 });
}

// PATCH /api/clients - Update white-label settings
export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Handle white-label settings update
  if (body.whiteLabel !== undefined || body.whiteLabelLogo !== undefined || body.whiteLabelDomain !== undefined) {
    const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        ...(body.whiteLabel !== undefined && { whiteLabel: body.whiteLabel }),
        ...(body.whiteLabelLogo !== undefined && { whiteLabelLogo: body.whiteLabelLogo }),
        ...(body.whiteLabelDomain !== undefined && { whiteLabelDomain: body.whiteLabelDomain }),
      },
      select: {
        whiteLabel: true,
        whiteLabelLogo: true,
        whiteLabelDomain: true,
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}