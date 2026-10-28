// Central billing configuration shared by the Stripe and Razorpay
// integrations. The goal is to keep the two providers side by side and switch
// between them with config, not code.

export type PaymentProvider = "razorpay" | "stripe" | "none";

export type PlanKey = "starter" | "pro" | "business";

export interface PlanConfig {
  key: PlanKey;
  name: string;
  /** Amount in the configured currency's smallest unit. */
  amountMinor: number;
  aiCredits: number;
  leadSearches: number;
  razorpayPlanId: string | null;
}

export const PLAN_META: Record<
  PlanKey,
  { name: string; amountUsdCents: number; aiCredits: number; leadSearches: number }
> = {
  starter: { name: "Starter", amountUsdCents: 2500, aiCredits: 100, leadSearches: 5 },
  pro: { name: "Pro", amountUsdCents: 5000, aiCredits: 200, leadSearches: 25 },
  business: { name: "Business", amountUsdCents: 10000, aiCredits: 500, leadSearches: 100 },
};

/**
 * Currency customers are charged in. Config-driven so the owner can switch
 * without a code change. Defaults to USD, which matches the existing prices.
 * Razorpay accounts commonly settle in INR — the owner must confirm the
 * currency and the INR (or other) prices; the amounts are NOT auto-converted.
 */
export function getPaymentCurrency(): string {
  return (process.env.PAYMENT_CURRENCY || "usd").toLowerCase();
}

/**
 * Which provider is active. Explicit PAYMENT_PROVIDER wins; otherwise we
 * auto-detect from whichever credentials are present. Returns "none" when no
 * provider is configured (pay buttons render as disabled/not-configured).
 */
export function getPaymentProvider(): PaymentProvider {
  const explicit = process.env.PAYMENT_PROVIDER;
  if (explicit === "razorpay" || explicit === "stripe" || explicit === "none") {
    return explicit;
  }
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return "razorpay";
  }
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  return "none";
}

/** Razorpay subscription plan ids come from config (Plans live in the dashboard). */
export function getRazorpayPlanId(plan: PlanKey): string | null {
  const map: Record<PlanKey, string | undefined> = {
    starter: process.env.RAZORPAY_STARTER_PLAN_ID,
    pro: process.env.RAZORPAY_PRO_PLAN_ID,
    business: process.env.RAZORPAY_BUSINESS_PLAN_ID,
  };
  return map[plan] || null;
}

/**
 * Plan amount in the configured currency's smallest unit. For USD the stored
 * amount is already in cents (matches the existing Stripe PLANS). For any other
 * currency the owner must supply an explicit per-plan amount (in that
 * currency's smallest unit) via RAZORPAY_<PLAN>_AMOUNT_MINOR; we refuse to
 * guess rather than silently charge USD numbers as another currency.
 */
export function getPlanAmountMinor(plan: PlanKey): number | null {
  const currency = getPaymentCurrency();
  if (currency === "usd") return PLAN_META[plan].amountUsdCents;

  const envName = `RAZORPAY_${plan.toUpperCase()}_AMOUNT_MINOR`;
  const raw = process.env[envName];
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

export function getPlans(): Record<PlanKey, PlanConfig> {
  const result = {} as Record<PlanKey, PlanConfig>;
  for (const key of ["starter", "pro", "business"] as PlanKey[]) {
    const meta = PLAN_META[key];
    result[key] = {
      key,
      name: meta.name,
      amountMinor: getPlanAmountMinor(key) ?? meta.amountUsdCents,
      aiCredits: meta.aiCredits,
      leadSearches: meta.leadSearches,
      razorpayPlanId: getRazorpayPlanId(key),
    };
  }
  return result;
}
