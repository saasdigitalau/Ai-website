import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe, FileText, Settings, ExternalLink, Calendar, BarChart3 } from "lucide-react";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } });
  if (!dbUser) redirect("/sign-in");

  const website = await prisma.website.findUnique({
    where: { id },
    include: { _count: { select: { blogPosts: true } } },
  });

  if (!website || (website.userId && website.userId !== dbUser.id)) {
    redirect("/dashboard/sites");
  }

  const blogCount = website._count?.blogPosts ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/sites" className="text-sm text-indigo-600 font-semibold hover:underline">
          &larr; Back to sites
        </Link>
        <h1 className="font-heading text-2xl font-extrabold text-gray-900 mt-2">{website.name}</h1>
        <p className="text-sm text-gray-500">{website.description}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href={`/dashboard/sites/${website.id}/blog`}
          className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm mb-4 group-hover:scale-105 transition-transform">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="font-heading text-lg font-bold text-gray-900">Blog Posts</h3>
          <p className="mt-1 text-sm text-gray-500">
            {blogCount > 0
              ? `${blogCount} post${blogCount !== 1 ? "s" : ""} generated`
              : "Generate SEO-optimized posts"}
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            Manage blog <ExternalLink className="h-3 w-3" />
          </div>
        </Link>

        <Link
          href={`/dashboard/sites/${website.id}/seo`}
          className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-sm mb-4 group-hover:scale-105 transition-transform">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h3 className="font-heading text-lg font-bold text-gray-900">SEO Analysis</h3>
          <p className="mt-1 text-sm text-gray-500">Score your site and get improvement tips</p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-600">
            View report <ExternalLink className="h-3 w-3" />
          </div>
        </Link>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-sm mb-4">
            <Globe className="h-5 w-5" />
          </div>
          <h3 className="font-heading text-lg font-bold text-gray-900">Preview Site</h3>
          <p className="mt-1 text-sm text-gray-500">View the live generated website</p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            {website.published ? "Published" : "Draft"}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm mb-4">
            <Settings className="h-5 w-5" />
          </div>
          <h3 className="font-heading text-lg font-bold text-gray-900">Settings</h3>
          <p className="mt-1 text-sm text-gray-500">Custom domain, branding, more</p>
        </div>
      </div>
    </div>
  );
}