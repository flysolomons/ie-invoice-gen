"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type ClientFormState, saveClient } from "./actions";

export type ClientDefaults = {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  currency: string;
  notes: string;
};

export const EMPTY_CLIENT: ClientDefaults = {
  name: "",
  email: "",
  phone: "",
  address: "",
  taxId: "",
  currency: "",
  notes: "",
};

export function ClientForm({ id, defaults }: { id: string | null; defaults: ClientDefaults }) {
  const [state, action, pending] = useActionState<ClientFormState, FormData>(
    saveClient.bind(null, id),
    null,
  );
  const err = (k: string) => state?.errors?.[k];
  const invalid = (k: string) => ({
    "aria-invalid": !!err(k),
    "aria-describedby": err(k) ? `${k}-error` : undefined,
  });

  return (
    <form action={action} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <Field id="name" label="Name" error={err("name")} className="sm:col-span-2">
        <Input id="name" name="name" defaultValue={defaults.name} required {...invalid("name")} />
      </Field>
      <Field id="email" label="Email (invoices are sent here)" error={err("email")}>
        <Input id="email" name="email" type="email" defaultValue={defaults.email} {...invalid("email")} />
      </Field>
      <Field id="phone" label="Phone" error={err("phone")}>
        <Input id="phone" name="phone" defaultValue={defaults.phone} />
      </Field>
      <Field id="address" label="Billing address" error={err("address")} className="sm:col-span-2">
        <Textarea id="address" name="address" rows={3} defaultValue={defaults.address} />
      </Field>
      <Field id="taxId" label="Tax / VAT ID" error={err("taxId")}>
        <Input id="taxId" name="taxId" defaultValue={defaults.taxId} />
      </Field>
      <Field id="currency" label="Currency (blank = business default)" error={err("currency")}>
        <Input
          id="currency"
          name="currency"
          maxLength={3}
          placeholder="USD"
          defaultValue={defaults.currency}
          {...invalid("currency")}
        />
      </Field>
      <Field id="notes" label="Internal notes" error={err("notes")} className="sm:col-span-2">
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaults.notes} />
      </Field>
      {err("_form") && <p className="text-sm text-destructive sm:col-span-2">{err("_form")}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : id ? "Save changes" : "Create client"}
        </Button>
      </div>
    </form>
  );
}
