import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Never cache this response — it must reflect live DB state on every hit.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up" });
  } catch (error) {
    // Never expose the connection string, hostname, or credentials.
    // Prisma surfaces a stable, safe `code` (e.g. P1001 "can't reach
    // database server") which is fine to return; the raw message is not.
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;

    return NextResponse.json(
      {
        ok: false,
        db: "down",
        error: code ? `database error (${code})` : "database unreachable",
      },
      { status: 503 }
    );
  }
}
