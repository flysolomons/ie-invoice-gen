import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

// Reads the session cookie on every request (Neon Auth).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

/** Only allow same-origin relative redirects after login. */
function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const nextPath = safeNext((await searchParams).next);

  if (await getCurrentUser()) redirect(nextPath);

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Sign in</CardTitle>
          <CardDescription>Use the email and password from your invite.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm nextPath={nextPath} />
        </CardContent>
      </Card>
    </main>
  );
}
