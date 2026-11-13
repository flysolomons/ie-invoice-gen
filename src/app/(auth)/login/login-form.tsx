"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type SignInState, signIn } from "../actions";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="next" value={nextPath} />
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          defaultValue={state?.email}
          required
          autoFocus
          aria-invalid={!!state?.error}
          className="h-11 text-base"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={!!state?.error}
            className="h-11 pr-11 text-base"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            aria-controls="password"
            className="absolute top-1/2 right-1 size-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
      </div>
      {state?.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-danger-foreground"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11 text-base">
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
