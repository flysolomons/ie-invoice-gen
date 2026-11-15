import { redirect } from "next/navigation";
import { recordSignIn } from "@/server/sign-ins";

/**
 * GET /login/microsoft-failed — Microsoft sign-in's errorCallbackURL. Public
 * (under /login). Logs the failure (we don't know who it was), then shows the
 * normal login page with an error.
 */
export async function GET() {
  await recordSignIn({ method: "microsoft", outcome: "failed", reason: "microsoft_error" });
  redirect("/login?error=microsoft");
}
