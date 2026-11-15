import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { accessOutcome, recordSignIn } from "@/server/sign-ins";

/** Only log sessions this fresh, so revisiting the URL later doesn't add entries. */
const FRESH_SESSION_MS = 5 * 60 * 1000;

/**
 * GET /signed-in?next=/path — where Microsoft sign-in lands (the callbackURL).
 *
 * Deliberately NOT under /login: the auth proxy finishes the OAuth handshake
 * (swaps the verifier for the session cookie) only on protected routes, so by
 * the time this runs the visitor has a session. We log it once per session,
 * then send them on.
 */
export async function GET(request: Request) {
  const next = safeRedirectPath(new URL(request.url).searchParams.get("next"));
  const { data } = await auth.getSession();
  const user = data?.user;
  const session = data?.session;

  if (user && session && Date.now() - new Date(session.createdAt).getTime() < FRESH_SESSION_MS) {
    await recordSignIn({
      method: "microsoft",
      email: user.email,
      authUserId: user.id,
      sessionId: session.id,
      ...(await accessOutcome(user)),
    });
  }
  redirect(next);
}
