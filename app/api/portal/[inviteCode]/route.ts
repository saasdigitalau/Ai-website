import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/portal/[inviteCode] - Get portal data for a client by invite code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await params;

  const client = await prisma.client.findUnique({
    where: { inviteCode },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          whiteLabel: true,
          whiteLabelLogo: true,
          whiteLabelDomain: true,
        },
      },
      website: {
        select: {
          id: true,
          name: true,
          description: true,
          businessType: true,
          html: true,
          published: true,
          approved: true,
          updatedAt: true,
        },
      },
      feedback: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          message: true,
          type: true,
          createdAt: true,
          read: true,
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json(
      { error: "Invalid invite link. This portal doesn't exist." },
      { status: 404 }
    );
  }

  if (!client.website) {
    return NextResponse.json(
      { error: "No website has been shared with you yet." },
      { status: 404 }
    );
  }

  // Mark as viewed
  if (!client.viewedAt) {
    await prisma.client.update({
      where: { id: client.id },
      data: { viewedAt: new Date() },
    });
  }

  // Mark feedback as read by the client viewing the portal
  // (only unread feedback from the freelancer, i.e., type !== 'approval' from client)

  return NextResponse.json({
    portal: {
      clientName: client.name,
      clientEmail: client.email,
      inviteCode: client.inviteCode,
      approved: client.approved,
      viewedAt: client.viewedAt,
      createdAt: client.createdAt,
      freelancerName: client.user?.name || "Your Freelancer",
      whiteLabel: client.user?.whiteLabel ?? false,
      whiteLabelLogo: client.user?.whiteLabelLogo ?? null,
      website: client.website,
      feedback: client.feedback,
    },
  });
}