import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  let websites: {
    id: string;
    name: string;
    description: string;
    businessType: string;
    published: boolean;
    createdAt: Date;
  }[] = [];
  let loadError = false;

  try {
    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } });
    if (dbUser) {
      websites = await prisma.website.findMany({
        where: { userId: dbUser.id },
        select: {
          id: true,
          name: true,
          description: true,
          businessType: true,
          published: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }
  } catch (error) {
    console.error("Could not load saved sites:", error);
    loadError = true;
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-gray-900 mb-6">
        My Sites
      </h1>

      {loadError ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-2">
            Saved sites could not be loaded
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Something went wrong reading your saved sites. Please reload the page.
          </p>
        </div>
      ) : websites.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-4">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/>
              <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>
            </svg>
          </div>
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-2">
            No websites yet
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Build your first website by describing your business. Sites you build
            while signed in are saved here.
          </p>
          <a
            href="/#builder"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:brightness-110 transition-all"
          >
            Build your first site
          </a>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {websites.length} saved site{websites.length !== 1 ? "s" : ""}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {websites.map((site) => (
              <Link
                key={site.id}
                href={`/dashboard/sites/${site.id}`}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    {site.businessType}
                  </span>
                  <span className="text-xs font-semibold text-gray-400">
                    {site.published ? "Published" : "Draft"}
                  </span>
                </div>
                <h2 className="font-heading text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {site.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  {site.description}
                </p>
                <p className="mt-4 text-xs text-gray-400">
                  Saved {site.createdAt.toISOString().slice(0, 10)}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
