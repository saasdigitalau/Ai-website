import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { formatAccessDate, resolveEntitlement } from "@/lib/entitlements";
import {
  NOT_CONNECTED_MESSAGE,
  RAZORPAY_CURRENCY,
  RazorpayNotConnectedError,
  RazorpayRequestError,
  isCurrencyUnsupportedError,
  isRazorpayConfigured,
  razorpayKeyId,
} from "@/lib/razorpay";
import {
  PLAN_TIERS,
  PLAN_TIER_LIST,
  isPlanTier,
  startPlanPurchaseForUser,
} from "@/lib/razorpay-plans";

// ---------------------------------------------------------------------------
// GET  /api/subscription/razorpay — is card payment connected, and what are the
//      three plans? Public and honest: with no keys it answers connected:false
//      and the reason, and never invents a checkout.
//
// POST /api/subscription/razorpay — body { tier: "starter" | "pro" | "business" }.
//      Creates a one-time Razorpay order for one month of that plan in AUD
//      (A$25 / A$50 / A$100), records the purchase against the signed-in user,
//      and returns what Checkout needs (public key id + order id + amount).
//      Nothing is granted here: the plan and its site credits are granted only
//      by the signature-verified webhook, once per order id. Nothing renews.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

export async function GET() {
  const connected = isRazorpayConfigured();
  return NextResponse.json({
    connected,
    provider: "razorpay",
    currency: RAZORPAY_CURRENCY,
    // One month per payment, bought again when the month ends.
    oneTime: true,
    tiers: PLAN_TIER_LIST,
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
  if (!isPlanTier(tier)) {
    return NextResponse.json(
      {
        error: "Choose a plan: starter, pro or business.",
        tiers: PLAN_TIER_LIST,
      },
      { status: 400 }
    );
  }

  const config = PLAN_TIERS[tier];

  // What the account may use right now, not what the plan column says: the paid
  // month runs out on its own and the account reads as free after that.
  const entitlement = resolveEntitlement(user);

  if (entitlement.plan === tier && entitlement.accessUntil) {
    // The month they already paid for is still running, so a second order for
    // the same plan would charge twice for the same days.
    const until = formatAccessDate(entitlement.accessUntil);
    return NextResponse.json(
      {
        error: `Your ${config.name} plan is paid until ${until}. You can buy another month after that.`,
        tier,
        plan: entitlement.plan,
        accessUntil: entitlement.accessUntil.toISOString(),
      },
      { status: 409 }
    );
  }

  try {
    const { order, purchaseId } = await startPlanPurchaseForUser({
      userId: user.id,
      clerkId: user.clerkId,
      tier,
    });

    return NextResponse.json({
      connected: true,
      provider: "razorpay",
      oneTime: true,
      tier,
      name: config.name,
      amount: config.amount,
      currency: order.currency || RAZORPAY_CURRENCY,
      description: config.description,
      orderId: order.id,
      purchaseId,
      // The key id is public by design; the secret is never returned.
      keyId: razorpayKeyId(),
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
    if (isCurrencyUnsupportedError(err)) {
      // An AUD order is the one thing Razorpay takes happily in our currency, so
      // this should never happen; if it ever does, say it plainly.
      console.warn("Razorpay refused an AUD order:", err.message);
      return NextResponse.json(
        {
          connected: true,
          provider: "razorpay",
          currency: RAZORPAY_CURRENCY,
          tier,
          error: "The payment provider would not take an AUD card order. Nothing has been charged, and your plan stays as it is.",
        },
        { status: 422 }
      );
    }
    if (err instanceof RazorpayRequestError) {
      console.error("Razorpay plan order failed:", err.message);
      return NextResponse.json(
        { connected: true, provider: "razorpay", error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }
    console.error("Error creating Razorpay plan order:", err);
    return NextResponse.json(
      {
        connected: true,
        provider: "razorpay",
        error: "Could not start the card payment. Nothing has been charged.",
      },
      { status: 500 }
    );
  }
}
