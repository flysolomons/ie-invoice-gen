"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type SettingsState, updateSettings } from "./actions";

type Defaults = Record<
  | "name"
  | "email"
  | "phone"
  | "address"
  | "taxId"
  | "defaultCurrency"
  | "defaultTaxRate"
  | "defaultPaymentTermsDays"
  | "timezone"
  | "invoicePrefix"
  | "receiptPrefix"
  | "emailFromName"
  | "footerNotes",
  string
>;

export function SettingsForm({ defaults, readOnly }: { defaults: Defaults; readOnly: boolean }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateSettings, null);

  useEffect(() => {
    if (state?.ok) toast.success("Settings saved");
  }, [state]);

  const field = (
    name: keyof Defaults,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaults[name]}
        disabled={readOnly}
        aria-invalid={!!state?.errors?.[name]}
        {...props}
      />
      {state?.errors?.[name] && <p className="text-sm text-destructive">{state.errors[name][0]}</p>}
    </div>
  );

  return (
    <form action={action} className="grid gap-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-medium">Business</legend>
        <div className="sm:col-span-2">{field("name", "Business name", { required: true })}</div>
        {field("email", "Email", { type: "email" })}
        {field("phone", "Phone")}
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" name="address" rows={3} defaultValue={defaults.address} disabled={readOnly} />
        </div>
        {field("taxId", "Tax / VAT ID")}
        {field("emailFromName", "Email sender name")}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-medium">Invoicing defaults</legend>
        {field("defaultCurrency", "Currency", { maxLength: 3 })}
        {field("defaultTaxRate", "Tax rate (%)", { type: "number", step: "0.01", min: 0, max: 100 })}
        {field("defaultPaymentTermsDays", "Payment terms (days)", { type: "number", min: 0, max: 365 })}
        {field("timezone", "Timezone")}
        {field("invoicePrefix", "Invoice number prefix")}
        {field("receiptPrefix", "Receipt number prefix")}
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="footerNotes">Footer notes (payment instructions, thanks…)</Label>
          <Textarea id="footerNotes" name="footerNotes" rows={3} defaultValue={defaults.footerNotes} disabled={readOnly} />
        </div>
      </fieldset>

      {!readOnly && (
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      )}
    </form>
  );
}
