"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { type PaymentFormState, recordPayment } from "@/app/(app)/payments/actions";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/payments";

export function RecordPaymentForm({
  invoiceId,
  balance,
  currency,
  today,
}: {
  invoiceId: string;
  /** Balance due as a decimal string, e.g. "368.99". */
  balance: string;
  currency: string;
  today: string;
}) {
  const [state, action, pending] = useActionState<PaymentFormState, FormData>(
    recordPayment.bind(null, invoiceId),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(`Payment recorded — receipt ${state.receiptNumber}`);
      formRef.current?.reset();
    }
  }, [state]);

  const err = (k: string) => state?.errors?.[k];
  // After an error, show what was submitted (React resets uncontrolled forms on submit).
  const v = state?.ok ? undefined : state?.values;
  const a11y = (k: string) => ({
    "aria-invalid": !!err(k),
    "aria-describedby": err(k) ? `pay-${k}-error` : undefined,
  });

  return (
    <form
      ref={formRef}
      action={action}
      // Re-mount after each recorded payment so defaults pick up the new balance.
      key={balance}
      className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.5fr_auto] lg:items-end"
    >
      <Field id="pay-amount" label={`Amount (${currency})`} error={err("amount")}>
        <Input
          id="pay-amount"
          name="amount"
          inputMode="decimal"
          defaultValue={v?.amount ?? balance}
          required
          {...a11y("amount")}
        />
      </Field>
      <Field id="pay-paidAt" label="Date received" error={err("paidAt")}>
        <Input
          id="pay-paidAt"
          name="paidAt"
          type="date"
          max={today}
          defaultValue={v?.paidAt ?? today}
          required
          {...a11y("paidAt")}
        />
      </Field>
      <Field id="pay-method" label="Method" error={err("method")}>
        <NativeSelect id="pay-method" name="method" defaultValue={v?.method ?? "bank_transfer"}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="pay-reference" label="Reference (optional)" error={err("reference")}>
        <Input
          id="pay-reference"
          name="reference"
          placeholder="Bank ref, cheque no…"
          defaultValue={v?.reference ?? ""}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Recording…" : "Record payment"}
      </Button>
      {err("_form") && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-5">
          {err("_form")}
        </p>
      )}
    </form>
  );
}
