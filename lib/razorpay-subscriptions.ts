import { prisma } from "@/lib/prisma";
import {
  RAZORPAY_CURRENCY,
  createRazorpayPlan,
  createRazorpaySubscription,
  type RazorpaySubscriptionEntity,
  type RazorpayWebhookEvent,
} from "@/lib/razorpay";

// ---------------------------------------------------------------------------
// Subscription tiers and the Razorpay subscription lifecycle
//
// Three monthly tiers, priced in AUD (owner decision, Oct 28). Amounts are in
// cents because that is what Razorpay takes for AUD, matching how invoices are
// stored.
//
// The rules this file exists to enforce:
//
//  * A Razorpay *plan* must exist before a *subscription* can be created, so
//    each tier resolves to a plan id: an explicit RAZORPAY_PLAN_* env var wins,
//    then a cached id from the RazorpayPlan table, then a freshly created plan.
//  * Creating a subscription never grants a plan. User.plan and
//    User.subscriptionStatus are written only by the signature-verified webhook
//    in app/api/webhook/razorpay/route.ts, from subscription.activated,
//    subscription.charged and subscription.cancelled.
//  * No keys → every caller gets a typed "not connected" error; nothing here
//    throws at module load.
// ---------------------------------------------------------------------------

export const SUBSCRIPTION_TIERS = {
  starter: {
    name: "Starter",
    amount: 2500, // A$25.00 / month, in cents
    description: "Starter — A$25 per month",
  },
  pro: {
    name: "Pro",
    amount: 5000, // A$50.00 / month
    description: "Pro — A$50 per month",
  },
  business: {
    name: "Business",
    amount: 10000, // A$100.00 / month
    description: "Business — A$100 per month",
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export const SUBSCRIPTION_TIER_KEYS = Object.keys(SUBSCRIPTION_TIERS) as SubscriptionTier[];

export function isSubscriptionTier(value: unknown): value is SubscriptionTier {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SUBSCRIPTION_TIERS, value);
}

/** Public catalogue — safe to return to the browser (no secrets, no plan ids). */
export const SUBSCRIPTION_TIER_LIST = SUBSCRIPTION_TIER_KEYS.map((tier) => ({
  tier,
  name: SUBSCRIPTION_TIERS[tier].name,
  amount: SUBSCRIPTION_TIERS[tier].amount,
  currency: RAZORPAY_CURRENCY,
  period: "monthly" as const,
  interval: 1,
  description: SUBSCRIPTION_TIERS[tier].description,
}));

/**
 * Optional per-tier plan id overrides. Set these after creating the plans once
 * in the Razorpay dashboard (or let the first checkout create them).
 */
export const PLAN_ID_ENV: Record<SubscriptionTier, string> = {
  starter: "RAZORPAY_PLAN_STARTER",
  pro: "RAZORPAY_PLAN_PRO",
  business: "RAZORPAY_PLAN_BUSINESS",
};

/**
 * Razorpay's maximum number of billing cycles for a subscription is 100, so a
 * monthly tier is authorised for 100 months. A subscription that runs out is
 * simply re-created; nothing here assumes it renews forever.
 */
export const SUBSCRIPTION_TOTAL_COUNT = 100;

/** Plan ids resolved during this process's lifetime, per tier. */
const planIdMemo = new Map<SubscriptionTier, string>();

/**
 * The Razorpay plan id for a tier. Env override → RazorpayPlan table → create
 * one at Razorpay and cache it. Creating a plan is idempotent enough for our
 * purposes (an unused duplicate plan costs nothing and charges no one), but the
 * cache keeps it to one per tier whenever the database or the process holds it.
 */
export async function resolveRazorpayPlanId(tier: SubscriptionTier): Promise<string> {
  const fromEnv = process.env[PLAN_ID_ENV[tier]];
  if (fromEnv) return fromEnv;

  const memoized = planIdMemo.get(tier);
  if (memoized) return memoized;

  try {
    const cached = await prisma.razorpayPlan.findUnique({ where: { tier } });
    if (cached?.planId) {
      planIdMemo.set(tier, cached.planId);
      return cached.planId;
    }
  } catch (err: any) {
    // No database reachable: fall through and create the plan. The plan id is
    // still usable for this process, it just is not remembered for the next one.
    console.warn("Razorpay plan cache unavailable:", err?.message || err);
  }

  const config = SUBSCRIPTION_TIERS[tier];
  const plan = await createRazorpayPlan({
    name: `SiteLaunch ${config.name}`,
    amount: config.amount,
    description: config.description,
    notes: { tier },
  });

  planIdMemo.set(tier, plan.id);

  try {
    await prisma.razorpayPlan.upsert({
      where: { tier },
      update: { planId: plan.id, amount: config.amount, currency: RAZORPAY_CURRENCY },
      create: {
        tier,
        planId: plan.id,
        amount: config.amount,
        currency: RAZORPAY_CURRENCY,
        period: "monthly",
      },
    });
  } catch (err: any) {
    console.warn("Could not cache the Razorpay plan id:", err?.message || err);
  }

  return plan.id;
}

export type StartedSubscription = {
  subscription: RazorpaySubscriptionEntity;
  planId: string;
  tier: SubscriptionTier;
};

/**
 * Create a Razorpay subscription for a signed-in user and record it against the
 * user row so the webhook can find them by subscription id.
 *
 * Deliberately does NOT touch User.plan or User.subscriptionStatus: a
 * subscription that has been created but not paid must not grant a plan.
 */
export async function startSubscriptionForUser(params: {
  userId: string;
  clerkId: string;
  tier: SubscriptionTier;
}): Promise<StartedSubscription> {
  const planId = await resolveRazorpayPlanId(params.tier);

  const subscription = await createRazorpaySubscription({
    planId,
    totalCount: SUBSCRIPTION_TOTAL_COUNT,
    notes: {
      userId: params.userId,
      clerkId: params.clerkId,
      tier: params.tier,
    },
  });

  await prisma.user.update({
    where: { id: params.userId },
    data: {
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId: planId,
    },
  });

  return { subscription, planId, tier: params.tier };
}

// ---------------------------------------------------------------------------
// Webhook side
// ---------------------------------------------------------------------------

export const SUBSCRIPTION_EVENTS = [
  "subscription.activated",
  "subscription.charged",
  "subscription.cancelled",
] as const;

export type SubscriptionEventName = (typeof SUBSCRIPTION_EVENTS)[number];

export function isSubscriptionEvent(event: string | undefined): event is SubscriptionEventName {
  return typeof event === "string" && (SUBSCRIPTION_EVENTS as readonly string[]).includes(event);
}

function toDate(unixSeconds: number | null | undefined): Date | null {
  if (!unixSeconds || !Number.isFinite(unixSeconds)) return null;
  return new Date(unixSeconds * 1000);
}

/** The tier whose cached plan id matches, if we have seen that plan. */
async function tierForPlanId(planId: string | undefined): Promise<SubscriptionTier | null> {
  if (!planId) return null;

  for (const tier of SUBSCRIPTION_TIER_KEYS) {
    if (process.env[PLAN_ID_ENV[tier]] === planId) return tier;
  }

  try {
    const row = await prisma.razorpayPlan.findUnique({ where: { planId } });
    if (row && isSubscriptionTier(row.tier)) return row.tier;
  } catch (err: any) {
    console.warn("Could not look up the Razorpay plan:", err?.message || err);
  }

  return null;
}

export type SubscriptionEventResult = {
  handled: boolean;
  reason?: string;
  userId?: string;
  tier?: SubscriptionTier | "free";
  status?: string;
};

/**
 * Apply a verified subscription event to the user it belongs to.
 *
 * The user is found by the subscription id recorded at checkout, falling back
 * to the ids carried in the subscription's notes. The tier comes from the
 * plan id, falling back to the tier in the notes only when the plan is unknown.
 */
export async function applySubscriptionEvent(
  event: RazorpayWebhookEvent
): Promise<SubscriptionEventResult> {
  const entity = event.payload?.subscription?.entity;
  if (!entity?.id) return { handled: false, reason: "no subscription entity" };

  const tierFromPlan = await tierForPlanId(entity.plan_id);
  const noteTier = isSubscriptionTier(entity.notes?.tier) ? entity.notes.tier : null;
  const tier = tierFromPlan ?? noteTier;

  let user = await prisma.user.findUnique({
    where: { razorpaySubscriptionId: entity.id },
  });
  if (!user && entity.notes?.userId) {
    user = await prisma.user.findUnique({ where: { id: entity.notes.userId } });
  }
  if (!user && entity.notes?.clerkId) {
    user = await prisma.user.findUnique({ where: { clerkId: entity.notes.clerkId } });
  }
  if (!user) return { handled: false, reason: "unknown subscription" };

  const endsAt = toDate(entity.current_end);
  const shared = {
    razorpaySubscriptionId: entity.id,
    ...(entity.plan_id ? { razorpayPlanId: entity.plan_id } : {}),
    ...(entity.customer_id ? { razorpayCustomerId: entity.customer_id } : {}),
  };

  if (event.event === "subscription.cancelled") {
    // No scheduler exists to defer a downgrade to the end of the paid period,
    // so cancelling drops the account to free immediately. The end of the paid
    // period is kept on the row for reference.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...shared,
        plan: "free",
        subscriptionStatus: "cancelled",
        ...(endsAt ? { subscriptionEndsAt: endsAt } : {}),
      },
    });
    return { handled: true, userId: user.id, tier: "free", status: "cancelled" };
  }

  // subscription.activated / subscription.charged: only a live subscription
  // grants a plan. An authenticated-but-unpaid or halted one does not.
  if (entity.status !== "active") {
    return { handled: false, reason: `subscription status is ${entity.status ?? "unknown"}` };
  }

  if (!tier) return { handled: false, reason: "unknown plan" };

  const unchanged =
    user.plan === tier &&
    user.subscriptionStatus === "active" &&
    user.razorpaySubscriptionId === entity.id;

  if (unchanged) {
    // Idempotent replay: a duplicate "charged" changes nothing.
    return { handled: true, userId: user.id, tier, status: "active" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...shared,
      plan: tier,
      subscriptionStatus: "active",
      ...(endsAt ? { subscriptionEndsAt: endsAt } : {}),
    },
  });

  return { handled: true, userId: user.id, tier, status: "active" };
}
