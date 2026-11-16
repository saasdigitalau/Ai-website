// ---------------------------------------------------------------------------
// Read-time plan entitlement
//
// Plans are sold one month at a time and nothing renews (owner decision, Nov
// 16). User.plan is what the last signature-verified webhook granted, and
// User.subscriptionEndsAt is the last moment of the month that was paid for. So
// "which plan is this account entitled to right now?" is a question answered
// when the row is read, not a value that has to be rewritten later: once the
// paid month has run out the account reads as free, with no scheduler and no
// job that can fail to fire. Buying another month is a new order, granted by
// the same webhook.
//
// A cancelled subscription (the older monthly-subscription flow) is treated the
// same way: the plan it paid for holds until subscriptionEndsAt, then free.
//
// Nothing here writes anything, and nothing here grants credits: letting a paid
// month end never changes a credit balance.
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
  /** True when the paid period has run out (or a cancellation ended it). */
  accessEnded: boolean;
  /** True when the paid month has run out and no renewal is coming. */
  expired: boolean;
};

/**
 * Which plan the account may use at `now`.
 *
 *  * No stored plan, or stored plan "free" → free.
 *  * A recorded paid-through date that has passed → free, whatever the status
 *    says: the month was bought and it is over.
 *  * Stored plan paid, not cancelled, inside its paid month → that plan.
 *  * Stored plan paid and cancelled → that plan until subscriptionEndsAt, then
 *    free. A cancellation with no paid-through date cannot prove any remaining
 *    paid time, so it reads as free.
 *  * No paid-through date at all → the stored plan (an older row that predates
 *    month-by-month billing; there is no expiry we can honestly claim).
 */
export function resolveEntitlement(
  user: EntitlementSource | null | undefined,
  now: Date = new Date()
): Entitlement {
  const storedPlan = user?.plan || "free";
  const status = user?.subscriptionStatus || "inactive";
  const accessUntil = user?.subscriptionEndsAt ?? null;
  const cancelled = status === "cancelled";
  const paidPeriodOver = accessUntil !== null && accessUntil.getTime() <= now.getTime();

  if (storedPlan === "free") {
    return {
      plan: "free",
      storedPlan,
      status,
      cancelled,
      accessUntil,
      accessEnded: cancelled || paidPeriodOver,
      expired: paidPeriodOver,
    };
  }

  if (paidPeriodOver) {
    return {
      plan: "free",
      storedPlan,
      status,
      cancelled,
      accessUntil,
      accessEnded: true,
      expired: true,
    };
  }

  if (cancelled) {
    // Cancelled with no paid-through date: no remaining paid time to claim.
    const stillPaid = accessUntil !== null;
    return {
      plan: stillPaid ? storedPlan : "free",
      storedPlan,
      status,
      cancelled: true,
      accessUntil,
      accessEnded: !stillPaid,
      expired: false,
    };
  }

  return {
    plan: storedPlan,
    storedPlan,
    status,
    cancelled: false,
    accessUntil,
    accessEnded: false,
    expired: false,
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
