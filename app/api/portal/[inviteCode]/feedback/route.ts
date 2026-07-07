import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/portal/[inviteCode]/feedback - Submit client feedback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await params;

  const client = await prisma.client.findUnique({
    where: { inviteCode },
    include: { website: { select: { id: true } } },
  });

  if (!client) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (!client.website) {
    return NextResponse.json(
      { error: "No website assigned to this client" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { message, type } = body;

  if (!message) {
    return NextResponse.json(
      { error: "Feedback message is required" },
      { status: 400 }
    );
  }

  const feedback = await prisma.feedback.create({
    data: {
      clientId: client.id,
      websiteId: client.website.id,
      message,
      type: type || "comment", // "comment", "revision", "approval"
    },
  });

  return NextResponse.json({ feedback }, { status: 201 });
}