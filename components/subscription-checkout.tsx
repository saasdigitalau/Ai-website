"use client";

// ---------------------------------------------------------------------------
// Shared Razorpay Checkout wiring for the three AUD subscription tiers.
//
//  * The plan buttons POST { tier } to /api/subscription/razorpay, which creates
//    the Razorpay subscription and hands back the public key id + subscription
//    id. Nothing here ever sets the user's plan: the plan is granted only by the
//    signature-verified webhook in app/api/webhook/razorpay/route.ts, so the UI
//    shows a "being confirmed" state after Checkout completes.
//  * With no Razorpay keys the route answers 503 / connected:false and the UI
//    shows the "Card payments are not connected yet" panel instead of a checkout.
//  * Anonymous visitors get 401 and are sent to sign-up — checkout needs an
//    account to attach the subscription to.
// ---------------------------------------------------------------------------

import { useState } from "react";
import toast from "react-hot-toast";

export type SubscriptionTier = "starter" | "pro" | "business";

export const SUBSCRIPTION_TIER_BUTTONS: { tier: SubscriptionTier; name: string; price: string }[] = [
  { tier: "starter", name: "Starter", price: "A$25" },
  { tier: "pro", name: "Pro", price: "A$50" },
  { tier: "business", name: "Business", price: "A$100" },
];

// Minimal shape of the Razorpay Checkout instance we use.
interface RazorpayCheckoutInstance {
  open: () => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
}
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckoutInstance;

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
  return new Promise((resolve, reject) => {
    const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
    if (existing) return resolve(existing);

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => {
      const ctor = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
      if (ctor) resolve(ctor);
      else reject(new Error("Razorpay Checkout did not load"));
    };
    script.onerror = () => reject(new Error("Razorpay Checkout failed to load"));
    document.body.appendChild(script);
  });
}

export function useSubscriptionCheckout() {
  const [startingTier, setStartingTier] = useState<SubscriptionTier | null>(null);
  // null = not asked yet, false = provider not connected, true = checkout works.
  const [cardPaymentsConnected, setCardPaymentsConnected] = useState<boolean | null>(null);
  // Set once Razorpay Checkout reports a completed payment. The plan is NOT
  // changed here — only the signature-verified webhook grants it.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<SubscriptionTier | null>(null);

  const startCheckout = async (tier: SubscriptionTier) => {
    setStartingTier(tier);
    try {
      const res = await fetch("/api/subscription/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        // Checkout needs an account to attach the subscription to.
        window.location.assign("/sign-up");
        return;
      }

      if (res.status === 503 || data?.connected === false) {
        setCardPaymentsConnected(false);
        return;
      }

      if (!res.ok) {
        toast.error(data?.error || "Could not start the subscription");
        return;
      }

      setCardPaymentsConnected(true);

      const Razorpay = await loadRazorpayCheckout();
      const checkout = new Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "SiteLaunch AI",
        description: data.description || `${data.name || tier} plan — monthly`,
        prefill: data.prefill || {},
        theme: { color: "#6366f1" },
        handler: () => {
          // Razorpay has the payment; the plan is granted by the webhook only.
          setAwaitingConfirmation(tier);
          toast.success("Payment submitted — your plan updates once it is confirmed");
        },
        modal: {
          ondismiss: () => toast("Subscription checkout closed", { icon: "ℹ️" }),
        },
      });
      checkout.on("payment.failed", () => {
        toast.error("The payment did not go through. Your plan has not changed.");
      });
      checkout.open();
    } catch {
      toast.error("Could not open card checkout");
    } finally {
      setStartingTier(null);
    }
  };

  return {
    startCheckout,
    startingTier,
    cardPaymentsConnected,
    setCardPaymentsConnected,
    awaitingConfirmation,
  };
}

export function CardPaymentsNotConnected({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 ${className}`}>
      <div className="text-sm font-bold text-amber-900">Card payments are not connected yet</div>
      <p className="text-sm text-amber-800 mt-1">
        No card payments can be taken for plans yet. Nothing has been charged, and your plan stays
        as it is.
      </p>
    </div>
  );
}

export function SubscriptionPending({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 ${className}`}>
      <div className="text-sm font-bold text-blue-900">Payment submitted — being confirmed</div>
      <p className="text-sm text-blue-800 mt-1">
        The payment provider has your payment. Your plan changes once it is confirmed, which
        usually takes a moment. It has not changed yet.
      </p>
    </div>
  );
}
