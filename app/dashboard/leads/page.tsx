import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LeadsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-gray-900 mb-6">
        Lead Finder
      </h1>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500">
          Find local businesses without websites. Search by business type and
          location to discover your next client.
        </p>
        <div className="mt-6 p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">
            Lead finder search will be available here once connected to data
            sources.
          </p>
        </div>
      </div>
    </div>
  );
}