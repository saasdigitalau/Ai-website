import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SocialSnippetGenerator from "@/components/social-snippet-generator";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function SocialPage({
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
  });

  if (!website || (website.userId && website.userId !== dbUser.id)) {
    redirect("/dashboard/sites");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/sites/${id}`}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Media Snippets</h1>
          <p className="text-gray-500">{website.name}</p>
        </div>
      </div>

      <SocialSnippetGenerator
        websiteId={id}
        html={website.html}
        businessName={website.name}
      />
    </div>
  );
}