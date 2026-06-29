import { NextRequest, NextResponse } from "next/server";
import { generateWebsite } from "@/app/lib/website-generator";

export async function POST(req: NextRequest) {
  try {
    const { description, businessType } = await req.json();

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const website = await generateWebsite(description, businessType);
    return NextResponse.json(website);
  } catch (error: any) {
    console.error("API Error in generate-website:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}