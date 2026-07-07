import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/portal/[inviteCode]/approve - Client approves the website
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

  // Update client as approved
  await prisma.client.update({
    where: { id: client.id },
    data: { approved: true },
  });

  // Update website as approved
  await prisma.website.update({
    where: { id: client.website.id },
    data: { approved: true, published: true },
  });

  // Create an approval feedback entry
  await prisma.feedback.create({
    data: {
      clientId: client.id,
      websiteId: client.website.id,
      message: "The design has been approved! 🎉",
      type: "approval",
    },
  });

  return NextResponse.json({ success: true, message: "Website approved!" });
}