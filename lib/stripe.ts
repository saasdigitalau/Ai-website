import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24" as any,
  typescript: true,
});

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