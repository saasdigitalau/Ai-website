"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignOutButton } from "@clerk/nextjs";
import {
  Home,
  LayoutDashboard,
  Search,
  FileText,
  Settings,
  LogOut,
  Users,
  Palette,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/sites", label: "My Sites", icon: LayoutDashboard },
  { href: "/dashboard/brand-kit", label: "Brand Kit", icon: Palette },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/leads", label: "Lead Finder", icon: Search },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface DashboardNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    plan: string;
    aiCredits: number;
  };
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <span className="font-heading font-extrabold text-lg">
                SiteLaunch AI
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-semibold uppercase">
                {user.plan}
              </span>
              <span className="text-gray-400">
                {user.aiCredits} credits
              </span>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </nav>
  );
}