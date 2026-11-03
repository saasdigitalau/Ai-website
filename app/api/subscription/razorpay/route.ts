import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  NOT_CONNECTED_MESSAGE,
  RAZORPAY_CURRENCY,
  RazorpayNotConnectedError,
  RazorpayRequestError,
  isRazorpayConfigured,
  razorpayKeyId,
} from "@/lib/razorpay";
import {
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_TIER_LIST,
  isSubscriptionTier,
  startSubscriptionForUser,
} from "@/lib/razorpay-subscriptions";

// ---------------------------------------------------------------------------
// GET  /api/subscription/razorpay — is subscription billing connected, and what
//      are the three tiers? Public and honest: with no keys it answers
//      connected:false and the reason, and never invents a checkout.
//
// POST /api/subscription/razorpay — body { tier: "starter" | "pro" | "business" }.
//      Creates the Razorpay plan for that tier if it does not exist yet, creates
//      a monthly AUD subscription for the signed-in user, records the
//      subscription id against the user, and returns the checkout details
//      (public key id + subscription id). The plan itself is granted only by the
//      signature-verified webhook, never here.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

export async function GET() {
  const connected = isRazorpayConfigured();
  return NextResponse.json({
    connected,
    provider: "razorpay",
    currency: RAZORPAY_CURRENCY,
    period: "monthly",
    tiers: SUBSCRIPTION_TIER_LIST,
    error: connected ? undefined : NOT_CONNECTED_MESSAGE,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      {
        connected: false,
        provider: "razorpay",
        currency: RAZORPAY_CURRENCY,
        error: NOT_CONNECTED_MESSAGE,
      },
      { status: 503 }
    );
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const tier = body?.tier;
  if (!isSubscriptionTier(tier)) {
    return NextResponse.json(
      {
        error: "Choose a plan: starter, pro or business.",
        tiers: SUBSCRIPTION_TIER_LIST,
      },
      { status: 400 }
    );
  }

  const config = SUBSCRIPTION_TIERS[tier];

  if (user.subscriptionStatus === "active" && user.plan === tier) {
    return NextResponse.json(
      { error: `You are already subscribed to the ${config.name} plan.`, tier, plan: user.plan },
      { status: 409 }
    );
  }

  try {
    const { subscription, planId } = await startSubscriptionForUser({
      userId: user.id,
      clerkId: user.clerkId,
      tier,
    });

    return NextResponse.json({
      connected: true,
      provider: "razorpay",
      tier,
      name: config.name,
      amount: config.amount,
      currency: RAZORPAY_CURRENCY,
      period: "monthly",
      interval: 1,
      description: config.description,
      planId,
      subscriptionId: subscription.id,
      status: subscription.status,
      // The key id is public by design; the secret is never returned.
      keyId: razorpayKeyId(),
      // Razorpay's hosted subscription page, when it returns one.
      shortUrl: subscription.short_url ?? null,
      prefill: {
        name: user.name ?? undefined,
        email: user.email ?? undefined,
      },
    });
  } catch (err: any) {
    if (err instanceof RazorpayNotConnectedError) {
      return NextResponse.json(
        {
          connected: false,
          provider: "razorpay",
          currency: RAZORPAY_CURRENCY,
          error: NOT_CONNECTED_MESSAGE,
        },
        { status: 503 }
      );
    }
    if (err instanceof RazorpayRequestError) {
      console.error("Razorpay subscription failed:", err.message);
      return NextResponse.json(
        { connected: true, provider: "razorpay", error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }
    console.error("Error creating Razorpay subscription:", err);
    return NextResponse.json(
      {
        connected: true,
        provider: "razorpay",
        error: "Could not start a subscription. Nothing has been charged.",
      },
      { status: 500 }
    );
  }
}
