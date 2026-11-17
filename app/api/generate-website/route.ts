import { NextRequest, NextResponse } from "next/server";
import { generateWebsite } from "@/app/lib/website-generator";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  OUT_OF_CREDITS_MESSAGE,
  refundSiteCredit,
  spendSiteCredit,
} from "@/lib/site-credits";

export async function POST(req: NextRequest) {
  try {
    const { description, businessType, name, lang } = await req.json();
    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Signed-in generation costs one site credit, spent before any work is done
    // so parallel requests cannot double-spend the last credit. Anonymous / demo
    // generation stays free and writes no row.
    const user = await getCurrentUser();

    if (user) {
      const spend = await spendSiteCredit(user.id);
      if (!spend.ok) {
        return NextResponse.json(
          { error: OUT_OF_CREDITS_MESSAGE, creditsRemaining: 0 },
          { status: 402 }
        );
      }

      try {
        const website = await generateWebsite(
          description,
          businessType,
          name,
          lang
        );

        // Persist the generated site for signed-in users only.
        let savedId: string | null = null;
        try {
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
        } catch (saveError) {
          // A failed save (e.g. no database configured) must never break
          // generation — the credit is still spent because the site was built.
          console.error("Could not save generated website:", saveError);
        }

        return NextResponse.json({
          ...website,
          savedId,
          creditsRemaining: spend.remaining,
        });
      } catch (generateError) {
        // The build failed, so the credit it paid for is given back.
        await refundSiteCredit(user.id).catch((refundError) =>
          console.error("Could not refund site credit:", refundError)
        );
        throw generateError;
      }
    }

    const website = await generateWebsite(description, businessType, name, lang);
    return NextResponse.json({ ...website, savedId: null });
  } catch (error: any) {
    console.error("API Error in generate-website:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
