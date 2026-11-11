// ---------------------------------------------------------------------------
// Read-time plan entitlement
//
// User.plan is what the last signature-verified webhook wrote — the plan the
// customer pays for. A cancelled subscription keeps that plan until the end of
// the month already paid for, so "which plan is this account entitled to right
// now?" is a question answered when the row is read, not a value that has to be
// rewritten later.
//
// The webhook records the cancellation and the paid-through date
// (User.subscriptionEndsAt) and leaves User.plan alone; every reader goes
// through resolveEntitlement() below, which reports "free" once that date has
// passed. Nothing has to run for the downgrade to happen, and no scheduled job
// can fail to fire.
//
// Nothing here writes anything, and nothing here grants credits: cancelling a
// subscription never changes a credit balance.
// ---------------------------------------------------------------------------

export type EntitlementSource = {
  plan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionEndsAt?: Date | null;
};

export type Entitlement = {
  /** The plan the account is entitled to right now — "free" once the paid month is over. */
  plan: string;
  /** The plan column as stored, i.e. what the last verified webhook wrote. */
  storedPlan: string;
  /** The stored subscription status (active / cancelled / …). */
  status: string;
  /** True when a verified cancellation has been recorded. */
  cancelled: boolean;
  /** Last moment of the paid period, when one is recorded. */
  accessUntil: Date | null;
  /** True when a cancelled subscription's paid period has run out. */
  accessEnded: boolean;
};

/**
 * Which plan the account may use at `now`.
 *
 *  * No stored plan, or stored plan "free" → free.
 *  * Stored plan paid and not cancelled → that plan.
 *  * Stored plan paid and cancelled → that plan until subscriptionEndsAt, then
 *    free. A cancellation with no paid-through date cannot prove any remaining
 *    paid time, so it reads as free.
 */
export function resolveEntitlement(
  user: EntitlementSource | null | undefined,
  now: Date = new Date()
): Entitlement {
  const storedPlan = user?.plan || "free";
  const status = user?.subscriptionStatus || "inactive";
  const accessUntil = user?.subscriptionEndsAt ?? null;
  const cancelled = status === "cancelled";

  if (storedPlan === "free") {
    return {
      plan: "free",
      storedPlan,
      status,
      cancelled,
      accessUntil,
      accessEnded: cancelled,
    };
  }

  if (cancelled) {
    const stillPaid = accessUntil !== null && accessUntil.getTime() > now.getTime();
    return {
      plan: stillPaid ? storedPlan : "free",
      storedPlan,
      status,
      cancelled: true,
      accessUntil,
      accessEnded: !stillPaid,
    };
  }

  return {
    plan: storedPlan,
    storedPlan,
    status,
    cancelled: false,
    accessUntil,
    accessEnded: false,
  };
}

/** A date the way the dashboard shows it: "4 Dec 2026". */
export function formatAccessDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * One line of honest status copy for a cancelled subscription, or null when the
 * account is not cancelled. Never says "free" while paid access remains.
 */
export function describeCancellation(entitlement: Entitlement): string | null {
  if (!entitlement.cancelled) return null;
  if (entitlement.accessUntil && !entitlement.accessEnded) {
    return `Cancelled — access until ${formatAccessDate(entitlement.accessUntil)}.`;
  }
  if (entitlement.accessUntil) {
    return `Cancelled — access ended ${formatAccessDate(entitlement.accessUntil)}.`;
  }
  return "Cancelled — no further payments.";
}
