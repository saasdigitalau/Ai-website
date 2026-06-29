import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SitesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-gray-900 mb-6">
        My Sites
      </h1>
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
          Build your first AI-generated website by describing your business
        </p>
        <a
          href="/#builder"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:brightness-110 transition-all"
        >
          Build your first site
        </a>
      </div>
    </div>
  );
}