import { clerkMiddleware } from "@clerk/nextjs/server";

// The public landing page (`/`) must render without Clerk ever running in the
// middleware. Behind the reverse proxy Clerk's middleware performs a handshake
// round-trip with the Frontend API using the request's http:// origin, which
// the Clerk instance rejects (allowed_origins lists only https origins) ->
// 400 "Invalid host" returned to the browser.
//
// The signed-in area DOES need the middleware: every /dashboard route calls
// currentUser() server-side, and currentUser()/auth() require clerkMiddleware()
// to have populated the auth context. Without it they throw "Clerk: auth() was
// called but Clerk can't detect usage of clerkMiddleware()". API routes read the
// session with auth() and need the middleware for the same reason.
//
// So scope the middleware to exactly the surfaces that need it. `/`,
// /sign-in and /sign-up stay out: the landing page must never depend on Clerk,
// and sign-in/sign-up render Clerk's client components (<SignIn/>/<SignUp/>),
// which talk to Clerk from the browser and never call server-side auth.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Signed-in area — server-side currentUser().
    "/dashboard(.*)",
    // API routes — server-side auth().
    "/(api|trpc)(.*)",
  ],
};
