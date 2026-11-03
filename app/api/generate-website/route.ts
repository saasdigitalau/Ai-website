import { NextRequest, NextResponse } from "next/server";
import { generateWebsite } from "@/app/lib/website-generator";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { description, businessType, name, lang } = await req.json();
    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }
    const website = await generateWebsite(description, businessType, name, lang);

    // Persist the generated site for signed-in users only. Anonymous / demo
    // generation keeps working exactly as before and writes no row.
    let savedId: string | null = null;
    try {
      const user = await getCurrentUser();
      if (user) {
        const saved = await prisma.website.create({
          data: {
            userId: user.id,
            name: website.metadata.name,
            description: website.metadata.description,
            businessType: website.metadata.businessType,
            html: website.html,
          },
          select: { id: true },
        });
        savedId = saved.id;
      }
    } catch (saveError) {
      // A failed save (e.g. no database configured) must never break generation.
      console.error("Could not save generated website:", saveError);
    }

    return NextResponse.json({ ...website, savedId });
  } catch (error: any) {
    console.error("API Error in generate-website:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
