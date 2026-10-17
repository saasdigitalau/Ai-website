import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk's middleware is intentionally scoped to API routes only.
//
// Why not page routes (/ , /sign-in, /sign-up, /dashboard, ...)?
// On a *document* navigation Clerk's middleware performs a handshake
// round-trip to its Frontend API and derives the handshake origin from
// the request as the app sees it. Behind our reverse proxy the app sees
// plain `http://<host>`, which the Clerk instance rejects (allowed_origins
// only lists https origins) -> 400 "Invalid host" returned to the browser.
//
// The page routes do their own auth server-side (dashboard calls
// currentUser() and redirects to /sign-in; /sign-in and /sign-up render the
// <SignIn/> / <SignUp/> *client* components, which talk to Clerk client-side).
// None of them need the middleware, and keeping it off page routes means the
// public landing page renders even when Clerk is slow, rate-limited or down.
//
// API routes that read the session use `auth()` from @clerk/nextjs/server,
// which verifies the session token locally and does not require the middleware
// (no `getAuth()` is used anywhere). API requests are also not document
// navigations, so they never trigger the handshake.

export default clerkMiddleware();

export const config = {
  matcher: [
    // Only run for API routes (and any tRPC routes if added later).
    "/(api|trpc)(.*)",
  ],
};
