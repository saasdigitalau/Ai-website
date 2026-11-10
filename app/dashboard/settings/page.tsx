import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserButton } from "@clerk/nextjs";
import WhiteLabelSettings from "@/components/white-label-settings";
import PlanUpgrade from "@/components/plan-upgrade";
import { describeCancellation, resolveEntitlement } from "@/lib/entitlements";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
  });

  // What the account may use right now: a cancelled subscription keeps its plan
  // until the end of the month already paid for.
  const entitlement = resolveEntitlement(dbUser);
  const cancellationNote = describeCancellation(entitlement);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-gray-900 mb-6">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Profile */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
            Profile
          </h2>
          <div className="flex items-center gap-4">
            <UserButton afterSignOutUrl="/" />
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-sm text-gray-500">
                {user.emailAddresses[0]?.emailAddress || ""}
              </div>
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
            Plan & Billing
          </h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-500">Current Plan</div>
              <div className="text-xl font-extrabold text-gray-900 capitalize">
                {entitlement.plan}
              </div>
            </div>
          </div>
          {cancellationNote && (
            <p className="mb-4 text-xs text-amber-600">{cancellationNote}</p>
          )}
          <PlanUpgrade currentPlan={entitlement.plan} />
          <div className="mt-4 text-xs text-gray-400">
            Site Credits: {dbUser?.aiCredits ?? 0}
          </div>
        </div>

        {/* White-Label Portal */}
        <WhiteLabelSettings
          initialWhiteLabel={dbUser?.whiteLabel ?? false}
          initialLogo={dbUser?.whiteLabelLogo ?? null}
          initialDomain={dbUser?.whiteLabelDomain ?? null}
        />
      </div>
    </div>
  );
}