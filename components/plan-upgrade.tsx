"use client";

import {
  CardPaymentsNotConnected,
  SUBSCRIPTION_TIER_BUTTONS,
  SubscriptionPending,
  useSubscriptionCheckout,
} from "@/components/subscription-checkout";

// The settings "Upgrade" control: one button per tier, each starting a real
// Razorpay checkout. Nothing here sets the plan — the webhook does.
export default function PlanUpgrade({ currentPlan }: { currentPlan: string }) {
  const { startCheckout, startingTier, cardPaymentsConnected, awaitingConfirmation } =
    useSubscriptionCheckout();

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {SUBSCRIPTION_TIER_BUTTONS.map(({ tier, name, price }) => {
          const isCurrent = currentPlan === tier;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => startCheckout(tier)}
              disabled={isCurrent || startingTier !== null}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 transition-all disabled:opacity-50 ${
                isCurrent ? "" : "hover:brightness-110"
              }`}
            >
              {startingTier === tier && (
                <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
              )}
              {isCurrent ? `${name} — current plan` : `Upgrade to ${name} · ${price}/mo`}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Prices are in AUD per month. Your plan changes only after the payment is confirmed by the
        payment provider.
      </p>

      {cardPaymentsConnected === false && <CardPaymentsNotConnected className="mt-4" />}
      {awaitingConfirmation && <SubscriptionPending className="mt-4" />}
    </div>
  );
}
