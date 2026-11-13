import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/app/brand-logo";
import { BrandPanel } from "@/components/auth/brand-panel";
import { APP_NAME } from "@/lib/constants";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/server/settings";
import { LoginForm } from "./login-form";

// Reads the session cookie on every request (Neon Auth).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const nextPath = safeRedirectPath((await searchParams).next);

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

          <LoginForm nextPath={nextPath} />

          <p className="text-center text-sm text-muted-foreground lg:text-left">
            Don&rsquo;t have an account? Ask your account owner for an invite.
          </p>
        </div>
      </main>
    </div>
  );
}
