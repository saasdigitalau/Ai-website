// No middleware needed - auth is handled at the page/layout level
// Dashboard pages check currentUser() and redirect to /sign-in
// This avoids Clerk key validation issues on the landing page

export const config = {
  matcher: [],
};