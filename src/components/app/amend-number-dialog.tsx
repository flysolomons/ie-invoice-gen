"use client";

import { Pencil } from "lucide-react";
import { useActionState, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { AmendNumberState } from "@/app/(app)/invoices/amend-number-actions";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AMEND_REASON_MAX, DOC_NUMBER_MAX, type DocKind } from "@/lib/document-number";

type AmendAction = (prev: AmendNumberState, formData: FormData) => Promise<AmendNumberState>;

/**
 * Owner-only "Amend number" button + dialog, for an invoice or a receipt.
 * `action` is a server action already bound to the document id.
 */
export function AmendNumberDialog({
  kind,
  current,
  action,
}: {
  kind: DocKind;
  current: string;
  action: AmendAction;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  // The form mounts on each open, so a previous error or value doesn't linger.
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          kind === "invoice" ? (
            <Button variant="outline" />
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Amend receipt number ${current}`}
              title="Amend receipt number"
            />
          )
        }
      >
        <Pencil aria-hidden />
        {kind === "invoice" && "Amend number"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {open && (
          <AmendForm kind={kind} current={current} action={action} onDone={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AmendForm({
  kind,
  current,
  action,
  onDone,
}: {
  kind: DocKind;
  current: string;
  action: AmendAction;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<AmendNumberState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(`${kind === "invoice" ? "Invoice" : "Receipt"} number updated`);
      onDone();
    }
  }, [state, kind, onDone]);

  const err = (k: string) => state?.errors?.[k];
  const v = state?.values;
  const a11y = (k: string) => ({
    "aria-invalid": !!err(k),
    "aria-describedby": err(k) ? `amend-${k}-error` : undefined,
  });

  return (
    <form action={formAction} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Amend {kind} number</DialogTitle>
        <DialogDescription>
          Use this to match the airline or booking system&rsquo;s number. The current number{" "}
          <span className="font-medium text-foreground">{current}</span> stays reserved and the
          change is recorded in the history. PDFs already sent keep the old number.
        </DialogDescription>
      </DialogHeader>
      <Field id="amend-number" label="New number" error={err("number")}>
        <Input
          id="amend-number"
          name="number"
          defaultValue={v?.number ?? current}
          maxLength={DOC_NUMBER_MAX}
          autoComplete="off"
          required
          autoFocus
          {...a11y("number")}
        />
      </Field>
      <Field id="amend-reason" label="Reason (optional)" error={err("reason")}>
        <Input
          id="amend-reason"
          name="reason"
          defaultValue={v?.reason ?? ""}
          maxLength={AMEND_REASON_MAX}
          placeholder="e.g. Match ticket number from GDS"
          {...a11y("reason")}
        />
      </Field>
      {err("_form") && (
        <p role="alert" className="text-sm text-destructive">
          {err("_form")}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save number"}
        </Button>
      </DialogFooter>
    </form>
  );
}
