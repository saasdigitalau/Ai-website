import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { PLANS } from "@/lib/stripe";
import {
  getPaymentProvider,
  getPaymentCurrency,
  getPlans,
  PlanKey,
} from "@/lib/billing";
import {
  createRazorpayCustomer,
  createRazorpayOrder,
  createRazorpaySubscription,
  getRazorpayKeyId,
  RazorpayError,
} from "@/lib/razorpay";

const PLAN_KEYS: PlanKey[] = ["starter", "pro", "business"];

// POST /api/subscriptions — start a plan checkout.
//
// Razorpay has two modes:
//   * subscription — used when a plan id is configured (plans are created in
//     the Razorpay dashboard). Requires a customer and returns a checkout URL.
//   * one-time — fallback when no plan id exists: charges the plan amount once
//     and relies on a manual renewal path. We never pretend recurring billing
//     works when it does not.
// Stripe keeps its existing subscription checkout path.
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const plan = body.plan as PlanKey;
  if (!PLAN_KEYS.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const provider = getPaymentProvider();
  const plans = getPlans();
  const planConfig = plans[plan];
  const email = user.emailAddresses[0]?.emailAddress || "";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || email;

  if (provider === "razorpay") {
    const keyId = getRazorpayKeyId();
    if (!keyId) {
      return NextResponse.json(
        { error: "Payments are not configured.", configured: false, provider: "razorpay" },
        { status: 503 }
      );
    }

    const notes = { clerkId: user.id, plan, kind: "plan" };

    try {
      // Preferred: recurring subscription via a dashboard-created plan id.
      if (planConfig.razorpayPlanId) {
        const customer = await createRazorpayCustomer({ name, email });
        const subscription = await createRazorpaySubscription({
          planId: planConfig.razorpayPlanId,
          customerId: customer.id,
          totalCount: 12,
          notes,
        });
        return NextResponse.json({
          provider: "razorpay",
          mode: "subscription",
          shortUrl: subscription.short_url,
        });
      }

      // Fallback: one-time payment + manual renewal.
      if (planConfig.amountMinor === null) {
        return NextResponse.json(
          {
            error: `No amount configured for the "${plan}" plan in ${getPaymentCurrency()}.`,
            configured: false,
          },
          { status: 503 }
        );
      }

      const order = await createRazorpayOrder({
        amount: planConfig.amountMinor,
        currency: getPaymentCurrency(),
        receipt: `plan-${plan}-${user.id}`,
        notes,
      });

      return NextResponse.json({
        provider: "razorpay",
        mode: "onetime",
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        plan,
      });
    } catch (err) {
      if (err instanceof RazorpayError) {
        return NextResponse.json(
          { error: err.message, configured: err.code !== "not_configured" },
          { status: err.status }
        );
      }
      console.error("Error starting Razorpay checkout:", err);
      return NextResponse.json(
        { error: "Failed to start checkout" },
        { status: 500 }
      );
    }
  }

  if (provider === "stripe") {
    if (!stripe) {
      return NextResponse.json(
        { error: "Payments are not configured.", configured: false, provider: "stripe" },
        { status: 503 }
      );
    }

    const priceId = PLANS[plan].priceId;
    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for the "${plan}" plan.`, configured: false },
        { status: 503 }
      );
    }

    try {
      const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } });
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { clerkId: user.id, plan },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/#pricing`,
        customer: dbUser?.stripeCustomerId || undefined,
      });
      return NextResponse.json({ provider: "stripe", url: session.url });
    } catch (err: any) {
      console.error("Error creating Stripe checkout:", err);
      return NextResponse.json(
        { error: err.message || "Failed to create checkout" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Payments are not configured.", configured: false, provider: "none" },
    { status: 503 }
  );
}
