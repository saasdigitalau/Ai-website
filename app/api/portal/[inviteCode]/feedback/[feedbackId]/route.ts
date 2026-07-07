import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/portal/[inviteCode]/feedback/[feedbackId] - Mark feedback as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ inviteCode: string; feedbackId: string }> }
) {
  const { inviteCode, feedbackId } = await params;

  const client = await prisma.client.findUnique({
    where: { inviteCode },
    select: { id: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  const feedback = await prisma.feedback.findFirst({
    where: {
      id: feedbackId,
      clientId: client.id,
    },
  });

  if (!feedback) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  await prisma.feedback.update({
    where: { id: feedbackId },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}