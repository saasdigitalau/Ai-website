"use server";

import { auth } from "@clerk/nextjs/server";
import { stripe, PLANS, PlanKey } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function createCheckoutSession(plan: PlanKey) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const planConfig = PLANS[plan];
  if (!planConfig) throw new Error("Invalid plan");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    metadata: {
      clerkId: userId,
      plan,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/#pricing`,
    customer: user?.stripeCustomerId || undefined,
  });

  return { url: session.url };
}

export async function getStripeSession() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user?.stripeSubscriptionId) return null;

  const subscription = await stripe.subscriptions.retrieve(
    user.stripeSubscriptionId
  );
  return subscription;
}