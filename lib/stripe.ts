import Stripe from "stripe";

// Stripe is DORMANT in production (Razorpay is the live provider per the
// owner's decision) and the business runs with no connected Stripe account.
// The client must therefore be optional: the app must build and run even when
// STRIPE_SECRET_KEY is absent, so a missing key must never throw at module
// load (that previously broke `next build` for any environment without it).
// Consumers check for null and return a clean 503 / throw a clear error.
const stripeKey = process.env.STRIPE_SECRET_KEY;
export const stripe: Stripe | null = stripeKey
  ? new Stripe(stripeKey, {
      apiVersion: "2025-02-24" as any,
      typescript: true,
    })
  : null;

export const PLANS = {
  starter: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID || "",
    name: "Starter",
    amount: 2500, // $25
    aiCredits: 100,
    leadSearches: 5,
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
    name: "Pro",
    amount: 5000, // $50
    aiCredits: 200,
    leadSearches: 25,
  },
  business: {
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || "",
    name: "Business",
    amount: 10000, // $100
    aiCredits: 500,
    leadSearches: 100,
  },
} as const;

export type PlanKey = keyof typeof PLANS;