"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatBytes, MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { type ExpenseFormState, saveExpense } from "./actions";

export type ExpenseDefaults = {
  vendor: string;
  categoryId: string;
  amount: string;
  currency: string;
  expenseDate: string;
  notes: string;
};

export function ExpenseForm({
  id,
  defaults,
  categories,
  currentFile,
  today,
}: {
  id: string | null;
  defaults: ExpenseDefaults;
  categories: { id: string; name: string }[];
  currentFile: { name: string; size: number } | null;
  today: string;
}) {
  const [state, action, pending] = useActionState<ExpenseFormState, FormData>(
    saveExpense.bind(null, id),
    null,
  );
  const err = (k: string) => state?.errors?.[k];
  // Keep typed values after a failed submit (React resets uncontrolled forms).
  const v = (k: keyof ExpenseDefaults) => state?.values?.[k] ?? defaults[k];
  const a11y = (k: string) => ({
    "aria-invalid": !!err(k),
    "aria-describedby": err(k) ? `${k}-error` : undefined,
  });

  return (
    <form action={action} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <Field id="vendor" label="Vendor / paid to" error={err("vendor")} className="sm:col-span-2">
        <Input id="vendor" name="vendor" defaultValue={v("vendor")} required {...a11y("vendor")} />
      </Field>
      <Field id="amount" label="Amount" error={err("amount")}>
        <Input
          id="amount"
          name="amount"
          inputMode="decimal"
          defaultValue={v("amount")}
          required
          {...a11y("amount")}
        />
      </Field>
      <Field id="currency" label="Currency" error={err("currency")}>
        <Input
          id="currency"
          name="currency"
          maxLength={3}
          defaultValue={v("currency")}
          required
          {...a11y("currency")}
        />
      </Field>
      <Field id="expenseDate" label="Date" error={err("expenseDate")}>
        <Input
          id="expenseDate"
          name="expenseDate"
          type="date"
          max={today}
          defaultValue={v("expenseDate")}
          required
          {...a11y("expenseDate")}
        />
      </Field>
      <Field id="categoryId" label="Category" error={err("categoryId")}>
        <NativeSelect id="categoryId" name="categoryId" defaultValue={v("categoryId")}>
          <option value="">Uncategorised</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="newCategory" label="…or new category" error={err("newCategory")} className="sm:col-start-2">
        <Input
          id="newCategory"
          name="newCategory"
          placeholder="e.g. Marketing"
          defaultValue={state?.values?.newCategory ?? ""}
        />
      </Field>
      <Field
        id="file"
        label={`Receipt (JPG, PNG, WebP or PDF, up to ${formatBytes(MAX_UPLOAD_BYTES)})`}
        error={err("file")}
        className="sm:col-span-2"
      >
        <Input
          id="file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          {...a11y("file")}
        />
        {currentFile && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>
              Current: {currentFile.name} ({formatBytes(currentFile.size)}). Choosing a new file
              replaces it.
            </span>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="removeFile" /> Remove file
            </label>
          </div>
        )}
      </Field>
      <Field id="notes" label="Notes" error={err("notes")} className="sm:col-span-2">
        <Textarea id="notes" name="notes" rows={2} defaultValue={v("notes")} />
      </Field>
      {err("_form") && <p className="text-sm text-destructive sm:col-span-2">{err("_form")}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : id ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
