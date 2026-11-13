"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";

/** On failure the email is echoed back so the form keeps it (React resets forms on submit). */
export type SignInState = { error: string; email: string } | null;

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const { error } = await auth.signIn.email({
    email,
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    if (error.code?.startsWith("NETWORK_")) {
      return { error: "Can't reach the sign-in service. Try again shortly.", email };
    }
    return { error: "Invalid email or password.", email };
  }
  redirect(safeRedirectPath(formData.get("next")));
}

export async function signOut() {
  await auth.signOut();
  redirect("/login");
}
