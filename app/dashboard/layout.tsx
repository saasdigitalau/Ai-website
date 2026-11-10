import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/dashboard-nav";
import { resolveEntitlement } from "@/lib/entitlements";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  let dbUser: { clerkId: string; email: string; name: string; plan: string; aiCredits: number } | null = null;

  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.user.upsert({
      where: { clerkId: user.id },
      create: {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
        plan: "free",
        aiCredits: 0,
      },
      update: {},
    });
    // The plan shown is the one the account is entitled to right now, so a
    // cancelled subscription keeps its tier until the paid month ends.
    dbUser = {
      clerkId: row.clerkId,
      email: row.email || "",
      name: row.name || "User",
      plan: resolveEntitlement(row).plan,
      aiCredits: row.aiCredits,
    };
  } catch {
    // Database not connected — use Clerk data as fallback
    dbUser = {
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress || "",
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
      plan: "free",
      aiCredits: 0,
    };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={dbUser} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}