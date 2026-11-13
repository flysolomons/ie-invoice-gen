"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Microsoft's four-square mark (brand asset, decorative). */
function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" aria-hidden className="size-4">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function MicrosoftButton({ nextPath }: { nextPath: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const fail = () => {
      setPending(false);
      setError("Couldn't start Microsoft sign-in. Try again or use your email and password.");
    };
    try {
      // Redirects the browser to Microsoft; on success Neon Auth sends it back to nextPath.
      // The Neon client may either return { error } or throw (e.g. provider not configured).
      const { error } = await authClient.signIn.social({
        provider: "microsoft",
        callbackURL: nextPath,
        errorCallbackURL: "/login?error=microsoft",
      });
      if (error) fail();
    } catch {
      fail();
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={signIn}
        disabled={pending}
        className="h-11 gap-2.5 bg-card text-base"
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <MicrosoftLogo />}
        {pending ? "Redirecting to Microsoft…" : "Sign in with Microsoft"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
