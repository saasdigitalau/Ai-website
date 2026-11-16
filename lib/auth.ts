import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * The signed-in user's database row, created on first use if it does not exist
 * yet. Every authenticated route that needs a User row goes through here, so a
 * brand-new account gets its row (plan "free", aiCredits 0 — both schema
 * defaults) on the first request it makes, not only after saving a site.
 *
 * upsert (not find-then-create) so two parallel first requests cannot race into
 * a unique-constraint error on clerkId.
 */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  return prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
