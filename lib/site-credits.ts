// ---------------------------------------------------------------------------
// Site credits
//
// A plan is sold as site credits, so building a site has to cost one. Every
// signed-in generation spends exactly one credit, and a new account starts with
// FREE_SITE_CREDITS of them.
//
// The spend is a single conditional UPDATE (decrement where the balance is still
// at least one), so two parallel requests cannot both read "1 credit left" and
// both spend it: Postgres serialises the two updates on the row, the first
// matches and decrements, the second matches nothing and is refused. Never read
// the balance and then write it back — that is the race.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";

/** Free site credits every new account starts with (also the schema default). */
export const FREE_SITE_CREDITS = 3;

/**
 * Plain, honest copy for a refused generation. Names the plans and their
 * allowances so the person can act on it without hunting for a pricing page.
 */
export const OUT_OF_CREDITS_MESSAGE =
  "You are out of site credits. Each site you build costs one credit, and your balance is 0. " +
  "A plan sets your balance for one month: Starter A$25 for 100 site credits, Pro A$50 for 200, " +
  "Business A$100 for 500. Buy a month from the dashboard to keep building.";

export type SpendResult =
  | { ok: true; remaining: number }
  | { ok: false; remaining: 0 };

/**
 * Atomically spend one site credit for `userId`.
 *
 * Returns ok:false (and changes nothing) when the balance is already 0.
 */
export async function spendSiteCredit(userId: string): Promise<SpendResult> {
  const { count } = await prisma.user.updateMany({
    where: { id: userId, aiCredits: { gte: 1 } },
    data: { aiCredits: { decrement: 1 } },
  });

  if (count === 0) return { ok: false, remaining: 0 };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiCredits: true },
  });
  return { ok: true, remaining: user?.aiCredits ?? 0 };
}

/**
 * Give a spent credit back — used only when the work it paid for failed, so a
 * failed generation is never charged for.
 */
export async function refundSiteCredit(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { aiCredits: { increment: 1 } },
  });
}
