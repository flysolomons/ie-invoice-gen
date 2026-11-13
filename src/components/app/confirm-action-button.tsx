"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Two-click button for destructive server actions: the first click arms it,
 * the second runs the action. The action may return { error } to show a toast.
 */
export function ConfirmActionButton({
  action,
  label,
  confirmLabel = "Click again to confirm",
  variant = "outline",
}: {
  action: () => Promise<{ error?: string } | void>;
  label: string;
  confirmLabel?: string;
  variant?: "default" | "outline" | "destructive" | "ghost";
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={armed ? "destructive" : variant}
      disabled={pending}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (!armed) return setArmed(true);
        startTransition(async () => {
          const result = await action();
          if (result?.error) toast.error(result.error);
          setArmed(false);
        });
      }}
    >
      {pending ? "Working…" : armed ? confirmLabel : label}
    </Button>
  );
}
