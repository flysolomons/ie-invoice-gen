import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/app/brand-logo";
import { BrandPanel } from "@/components/auth/brand-panel";
import { env } from "@/env";
import { APP_NAME } from "@/lib/constants";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/server/settings";
import { LoginForm } from "./login-form";
import { MicrosoftButton } from "./microsoft-button";

// Reads the session cookie on every request (Neon Auth).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath = safeRedirectPath(params.next);
  const microsoftFailed = params.error === "microsoft";

  if (await getCurrentUser()) redirect(nextPath);

  const settings = await getSettings();
  const logoVersion = settings.logoKey;

  return (
    <div className="grid min-h-svh flex-1 lg:grid-cols-2">
      <BrandPanel businessName={settings.name} logoVersion={logoVersion} />

      <main className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo above the form on small screens (the brand panel is hidden there). */}
          <div className="flex justify-center lg:hidden">
            <BrandLogo
              logoVersion={logoVersion}
              name={settings.name}
              plate
              plateClassName="rounded-2xl p-2.5"
              className="h-14 w-auto"
            />
          </div>

          <div className="space-y-1.5 text-center lg:text-left">
            <h1 className="text-3xl font-semibold">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to continue to {APP_NAME}.</p>
          </div>

          {microsoftFailed && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-danger-foreground"
            >
              Microsoft sign-in didn&rsquo;t complete. Try again, or contact your IT team if it
              keeps failing.
            </p>
          )}

          {env.AUTH_MICROSOFT_ENABLED && (
            <>
              <MicrosoftButton nextPath={nextPath} />
              <div className="flex items-center gap-3 text-xs tracking-wide text-muted-foreground uppercase">
                <span className="h-px flex-1 bg-border" />
                or use email
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <LoginForm nextPath={nextPath} />

          <p className="text-center text-sm text-muted-foreground lg:text-left">
            {env.AUTH_MICROSOFT_ENABLED
              ? "Staff: use your work Microsoft account. Others, ask an owner for access."
              : "Don’t have an account? Ask your account owner for access."}
          </p>
        </div>
      </main>
    </div>
  );
}
