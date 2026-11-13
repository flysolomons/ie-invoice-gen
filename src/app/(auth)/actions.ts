"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type SignInState = { error: string } | null;

/** Only allow same-origin relative redirects after login. */
function safeNext(next: FormDataEntryValue | null) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const { error } = await auth.signIn.email({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    if (error.code?.startsWith("NETWORK_")) {
      return { error: "Can't reach the sign-in service. Try again shortly." };
    }
    return { error: "Invalid email or password." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  await auth.signOut();
  redirect("/login");
}
