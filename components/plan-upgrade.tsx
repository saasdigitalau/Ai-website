"use client";

import {
  CardPaymentsNotConnected,
  PLAN_TIER_BUTTONS,
  PaymentPending,
  usePlanCheckout,
} from "@/components/subscription-checkout";

// The settings "Plan & Billing" control: one button per plan, each starting a
// real Razorpay checkout for ONE month in AUD. Nothing here sets the plan — the
// verified webhook does — and nothing renews, so the month in force is shown
// with its end date and the same plan can be bought again once it ends.
export default function PlanUpgrade({
  currentPlan,
  planEndsAt = null,
  lastTier = null,
}: {
  currentPlan: string;
  /** ISO date the paid month runs out, when one is recorded. */
  planEndsAt?: string | null;
  /** The plan this account last bought a month of, for the "buy another month" label. */
  lastTier?: string | null;
}) {
  const { startCheckout, startingTier, cardPaymentsConnected, awaitingConfirmation } =
    usePlanCheckout();

  const endsOn = planEndsAt ? new Date(planEndsAt) : null;
  const paidUntil =
    endsOn && endsOn.getTime() > Date.now()
      ? endsOn.toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
      : null;

  const currentName =
    PLAN_TIER_BUTTONS.find((button) => button.tier === currentPlan)?.name ??
    (currentPlan === "free" ? "Free" : currentPlan);

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
        <div className="text-sm font-bold text-gray-900">
          {currentPlan === "free" ? "Free plan" : `${currentName} plan`}
          {paidUntil ? ` — paid until ${paidUntil}` : ""}
        </div>
        <p className="text-sm text-gray-700 mt-1">
          {currentPlan === "free"
            ? "No paid month is running. Buy one month below to switch a plan on."
            : "Plans are bought one month at a time and nothing renews on its own. When this month ends the account goes back to Free, and you can buy another month here."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PLAN_TIER_BUTTONS.map(({ tier, name, price }) => {
          const isCurrent = currentPlan === tier && paidUntil !== null;
          const isRenewal = !isCurrent && lastTier === tier;
          const label = isCurrent
            ? `${name} — current plan`
            : isRenewal
              ? `Buy another month · ${price}`
              : `${name} · ${price} for one month`;

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
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Prices are in AUD, charged once by card for one month. Your plan switches on only after the
        payment is confirmed by the payment provider.
      </p>

      {cardPaymentsConnected === false && <CardPaymentsNotConnected className="mt-4" />}
      {awaitingConfirmation && <PaymentPending className="mt-4" />}
    </div>
  );
}
