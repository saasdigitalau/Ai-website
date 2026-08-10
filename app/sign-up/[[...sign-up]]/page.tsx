import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">S</div>
        <h1 className="font-heading text-2xl font-extrabold text-gray-900">Create your account</h1>
        <p className="mt-2 text-sm text-gray-500">Start building beautiful websites in minutes</p>
        <div className="mt-6 p-6 bg-indigo-50 rounded-xl border border-indigo-200">
          <p className="text-sm text-gray-700">Add valid Clerk keys to <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code></p>
          <p className="text-xs text-gray-500 mt-2">The sign-up page will be available once <code className="bg-indigo-100 px-1 rounded font-mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and <code className="bg-indigo-100 px-1 rounded font-mono">CLERK_SECRET_KEY</code> are set.</p>
        </div>
        <Link href="/" className="mt-6 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          Back to home
        </Link>
      </div>
    </div>
  );
}