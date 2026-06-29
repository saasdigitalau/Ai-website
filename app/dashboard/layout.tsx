import { ClerkProvider } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/dashboard-nav";
import { prisma } from "@/lib/prisma";
import { Toaster } from "react-hot-toast";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Ensure user exists in DB
  const dbUser = await prisma.user.upsert({
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

  return (
    <ClerkProvider>
      <div className="min-h-screen bg-gray-50">
        <DashboardNav user={dbUser} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
      <Toaster position="top-right" />
    </ClerkProvider>
  );
}