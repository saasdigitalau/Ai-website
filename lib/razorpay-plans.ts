import { prisma } from "@/lib/prisma";
import {
  RAZORPAY_CURRENCY,
  createRazorpayOrder,
  type RazorpayOrder,
  type RazorpayWebhookEvent,
} from "@/lib/razorpay";

// ---------------------------------------------------------------------------
// Plan tiers and the one-month-at-a-time purchase lifecycle
//
// Three tiers, priced in AUD (owner decision, Oct 28). Amounts are in cents
// because that is what Razorpay takes for AUD, matching how invoices are
// stored.
//
// Owner decision (Nov 16): no auto-renewal. A plan is sold month by month as a
// one-time AUD card order, because Razorpay refuses an AUD *plan* and a
// subscription is built from a plan. So the rules this file enforces are:
//
//  * Buying a month creates a Razorpay order for the tier price and writes a
//    PlanPurchase row against the order id. It grants nothing.
//  * User.plan, User.subscriptionStatus, User.subscriptionEndsAt and the site
//    credits are written ONLY by the signature-verified webhook in
//    app/api/webhook/razorpay/route.ts, from a captured payment on that order.
//  * The paid month is the payment date plus one month. It is granted once per
//    order id — PlanPurchase.grantedAt is claimed inside a transaction, so a
//    retried or duplicated delivery cannot grant the same month twice.
//  * Site credits are SET to the tier allowance, never added, in the same
//    update as the plan.
//  * When the paid month runs out, nothing renews and nothing has to run: the
//    downgrade to free is a read-time decision in lib/entitlements.ts.
//  * No keys → every caller gets a typed "not connected" error; nothing here
//    throws at module load.
// ---------------------------------------------------------------------------

export const PLAN_TIERS = {
  starter: {
    name: "Starter",
    amount: 2500, // A$25.00 for one month, in cents
    description: "Starter plan — one month at A$25",
  },
  pro: {
    name: "Pro",
    amount: 5000, // A$50.00 for one month
    description: "Pro plan — one month at A$50",
  },
  business: {
    name: "Business",
    amount: 10000, // A$100.00 for one month
    description: "Business plan — one month at A$100",
  },
} as const;

export type PlanTier = keyof typeof PLAN_TIERS;

export const PLAN_TIER_KEYS = Object.keys(PLAN_TIERS) as PlanTier[];

export function isPlanTier(value: unknown): value is PlanTier {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PLAN_TIERS, value);
}

/**
 * Site credits granted per paid month, per tier (owner decision, Nov 3).
 *
 * A paid month *sets* the balance to this allowance instead of adding to it, so
 * a duplicate webhook delivery cannot stack and a downgrade cannot leave a
 * higher balance behind. Every user-facing label calls these "site credits";
 * the column name (User.aiCredits) is legacy and is deliberately not renamed.
 */
export const PLAN_CREDITS: Record<PlanTier, number> = {
  starter: 100,
  pro: 200,
  business: 500,
};

/** Public catalogue — safe to return to the browser (no secrets, no ids). */
export const PLAN_TIER_LIST = PLAN_TIER_KEYS.map((tier) => ({
  tier,
  name: PLAN_TIERS[tier].name,
  amount: PLAN_TIERS[tier].amount,
  currency: RAZORPAY_CURRENCY,
  description: PLAN_TIERS[tier].description,
}));

/**
 * The end of a paid month: the same day one month later, clamped to the last
 * day of the target month (31 Jan + one month = 28/29 Feb, not 3 March).
 */
export function addOneMonth(from: Date): Date {
  const day = from.getUTCDate();
  const next = new Date(from.getTime());
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const daysInTargetMonth = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
  ).getUTCDate();
  next.setUTCDate(Math.min(day, daysInTargetMonth));
  return next;
}

export type StartedPlanPurchase = {
  order: RazorpayOrder;
  purchaseId: string;
  tier: PlanTier;
};

/**
 * Create a Razorpay order for one month of `tier` and record it against the
 * user so the webhook can find the purchase by order id.
 *
 * Deliberately does NOT touch User.plan or the credits: an order that has been
 * created but not paid must not grant a month.
 */
export async function startPlanPurchaseForUser(params: {
  userId: string;
  clerkId: string;
  tier: PlanTier;
}): Promise<StartedPlanPurchase> {
  const config = PLAN_TIERS[params.tier];

  const order = await createRazorpayOrder({
    amount: config.amount,
    receipt: `plan-${params.tier}-${Date.now()}`,
    notes: {
      kind: "plan_purchase",
      tier: params.tier,
      userId: params.userId,
      clerkId: params.clerkId,
    },
  });

  const purchase = await prisma.planPurchase.create({
    data: {
      userId: params.userId,
      tier: params.tier,
      amount: config.amount,
      currency: RAZORPAY_CURRENCY,
      razorpayOrderId: order.id,
    },
  });

  return { order, purchaseId: purchase.id, tier: params.tier };
}

// ---------------------------------------------------------------------------
// Webhook side
// ---------------------------------------------------------------------------

export type PlanPurchaseEventResult = {
  handled: boolean;
  reason?: string;
  userId?: string;
  tier?: PlanTier;
  status?: string;
  /** The last moment of the paid month this delivery granted (or granted before). */
  accessUntil?: string;
  /** True only when this delivery granted the month and set the site credits. */
  creditsGranted?: boolean;
  /** The account's site-credit balance after this delivery. */
  siteCredits?: number;
  /** True when the money taken does not match the recorded price (the route answers 400). */
  mismatch?: boolean;
};

/**
 * Apply a verified payment to the plan purchase it belongs to.
 *
 * The purchase is found by the order id the payment carries, so a payment for
 * anything else (an invoice) answers "unknown order" and the caller carries on.
 * Only a captured payment that matches the recorded amount and AUD currency
 * grants a month, and only once per order id: the claim on
 * PlanPurchase.grantedAt is what makes a retry a no-op.
 */
export async function applyPlanPurchaseEvent(
  event: RazorpayWebhookEvent
): Promise<PlanPurchaseEventResult> {
  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id ?? event.payload?.order?.entity?.id;
  if (!orderId) return { handled: false, reason: "no order id" };

  const purchase = await prisma.planPurchase.findUnique({
    where: { razorpayOrderId: orderId },
  });
  if (!purchase) return { handled: false, reason: "unknown order" };

  if (!payment?.id) return { handled: false, reason: "no payment entity" };

  // payment.captured implies a captured payment, but check the entity itself so
  // an authorised-but-not-captured payment can never buy a month.
  const captured = payment.captured === true || payment.status === "captured";
  if (!captured) return { handled: false, reason: "payment not captured" };

  const paidAmount = Number(payment.amount);
  const paidCurrency = String(payment.currency || "").toUpperCase();
  if (paidAmount !== purchase.amount || paidCurrency !== RAZORPAY_CURRENCY) {
    console.error(
      `Razorpay webhook: amount/currency mismatch for plan purchase ${purchase.id} ` +
        `(expected ${purchase.amount} ${RAZORPAY_CURRENCY}, got ${paidAmount} ${paidCurrency || "?"})`
    );
    return {
      handled: false,
      mismatch: true,
      reason: "payment amount or currency does not match the plan price",
    };
  }

  if (!isPlanTier(purchase.tier)) {
    return { handled: false, reason: "unknown plan" };
  }
  const tier = purchase.tier;

  // A retried or duplicated delivery for an order that already bought its month
  // writes nothing and still answers handled:true, so Razorpay stops retrying.
  if (purchase.grantedAt) {
    return {
      handled: true,
      userId: purchase.userId,
      tier,
      status: "active",
      reason: "already granted",
      creditsGranted: false,
      accessUntil: purchase.periodEnd?.toISOString(),
    };
  }

  const grantedAt = new Date();
  const periodEnd = addOneMonth(grantedAt);
  const allowance = PLAN_CREDITS[tier];

  const granted = await prisma.$transaction(async (tx) => {
    // The claim: only one delivery can move grantedAt from null.
    const claim = await tx.planPurchase.updateMany({
      where: { id: purchase.id, grantedAt: null },
      data: {
        status: "paid",
        razorpayPaymentId: payment.id,
        grantedAt,
        periodStart: grantedAt,
        periodEnd,
      },
    });
    if (claim.count === 0) return null;

    return tx.user.update({
      where: { id: purchase.userId },
      data: {
        plan: tier,
        subscriptionStatus: "active",
        // The paid month runs to this date; after it the account reads as free.
        subscriptionEndsAt: periodEnd,
        // Set, never add: one paid month is one allowance.
        aiCredits: allowance,
      },
    });
  });

  if (!granted) {
    const fresh = await prisma.planPurchase.findUnique({ where: { id: purchase.id } });
    return {
      handled: true,
      userId: purchase.userId,
      tier,
      status: "active",
      reason: "already granted",
      creditsGranted: false,
      accessUntil: fresh?.periodEnd?.toISOString(),
    };
  }

  return {
    handled: true,
    userId: granted.id,
    tier,
    status: "active",
    accessUntil: periodEnd.toISOString(),
    creditsGranted: true,
    siteCredits: allowance,
  };
}
