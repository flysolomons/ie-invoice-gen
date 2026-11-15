"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { accessOutcome, recordSignIn } from "@/server/sign-ins";

/** On failure the email is echoed back so the form keeps it (React resets forms on submit). */
export type SignInState = { error: string; email: string } | null;

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const { data, error } = await auth.signIn.email({
    email,
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    const unavailable = error.code?.startsWith("NETWORK_");
    await recordSignIn({
      method: "password",
      outcome: "failed",
      email,
      reason: unavailable ? "service_unavailable" : "invalid_credentials",
    });
    if (unavailable) {
      return { error: "Can't reach the sign-in service. Try again shortly.", email };
    }
    return { error: "Invalid email or password.", email };
  }
  const user = data?.user;
  const access = user ? await accessOutcome(user) : { outcome: "success" as const, reason: null };
  await recordSignIn({
    method: "password",
    email: user?.email ?? email,
    authUserId: user?.id,
    ...access,
  });
  redirect(safeRedirectPath(formData.get("next")));
}

export async function signOut() {
  await auth.signOut();
  redirect("/login");
}
