import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe, Search, FileText, TrendingUp, Plus } from "lucide-react";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: {
      _count: {
        select: { websites: true, invoices: true, leads: true },
      },
    },
  });

  const stats = [
    {
      label: "Websites",
      value: dbUser?._count.websites ?? 0,
      icon: Globe,
      href: "/dashboard/sites",
      color: "from-indigo-500 to-purple-600",
    },
    {
      label: "Lead Searches",
      value: dbUser?._count.leads ?? 0,
      icon: Search,
      href: "/dashboard/leads",
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: "Invoices",
      value: dbUser?._count.invoices ?? 0,
      icon: FileText,
      href: "/dashboard/invoices",
      color: "from-orange-500 to-amber-500",
    },
    {
      label: "AI Credits Used",
      value: `${dbUser?.aiCredits ?? 0}`,
      icon: TrendingUp,
      href: "/dashboard/settings",
      color: "from-pink-500 to-rose-500",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-gray-900">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user.firstName || "there"}!
          </p>
        </div>
        <Link
          href="/#builder"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:brightness-110 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Site
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-3`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-extrabold text-gray-900">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
            Quick Start
          </h2>
          <div className="space-y-3">
            {[
              {
                title: "Build a website",
                desc: "Describe your business and get a site in seconds",
                href: "/#builder",
                color: "from-indigo-500 to-purple-600",
              },
              {
                title: "Find leads",
                desc: "Search for local businesses without websites",
                href: "/dashboard/leads",
                color: "from-emerald-500 to-teal-500",
              },
              {
                title: "Send an invoice",
                desc: "Create and send a professional invoice",
                href: "/dashboard/invoices",
                color: "from-orange-500 to-amber-500",
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white text-xs font-bold`}
                >
                  {item.title[0]}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">
                    {item.title}
                  </div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
            Subscription
          </h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-500">Current Plan</div>
              <div className="text-xl font-extrabold text-gray-900 capitalize">
                {dbUser?.plan || "Free"}
              </div>
            </div>
            <Link
              href="/#pricing"
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              {dbUser?.plan === "free" ? "Upgrade" : "Manage"}
            </Link>
          </div>
          <div className="text-xs text-gray-400">
            {dbUser?.plan === "free"
              ? "Upgrade to unlock AI credits, lead searches, and more."
              : "You're on a paid plan. Manage your subscription anytime."}
          </div>
        </div>
      </div>
    </div>
  );
}