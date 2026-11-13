"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/app/brand-logo";
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type LogoState, removeLogo, uploadLogo } from "./actions";

export function LogoForm({
  logoVersion,
  businessName,
  readOnly,
}: {
  logoVersion: string | null;
  businessName: string;
  readOnly: boolean;
}) {
  const hasLogo = !!logoVersion;
  const [state, action, pending] = useActionState<LogoState, FormData>(uploadLogo, null);

  useEffect(() => {
    if (state?.ok) toast.success("Logo updated");
  }, [state]);

  return (
    <div className="grid gap-3">
      {hasLogo ? (
        <BrandLogo
          logoVersion={logoVersion}
          name={businessName}
          plate
          plateClassName="w-fit rounded-lg p-2 shadow-none"
          className="h-16 w-auto"
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No logo yet. Invoices and receipts show the business name instead.
        </p>
      )}
      {!readOnly && (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <Input
            name="logo"
            type="file"
            accept="image/png,image/jpeg"
            aria-label="Logo file (PNG or JPG)"
            className="max-w-xs"
            required
          />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Uploading…" : hasLogo ? "Replace logo" : "Upload logo"}
          </Button>
          {hasLogo && (
            <ConfirmActionButton label="Remove" confirmLabel="Confirm remove" variant="ghost" action={removeLogo} />
          )}
        </form>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </div>
  );
}
