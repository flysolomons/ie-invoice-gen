import { auth } from "@/lib/auth";

/**
 * Coarse guard: redirects visitors without a valid Neon Auth session to /login.
 * Team membership and roles are checked on the server by requireUser()/requireOwner().
 */
export default auth.middleware({
  loginUrl: "/login",
  publicRoutes: ["/login", "/accept-invite", "/p", "/api/p", "/api/branding"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
