"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { calculateInvoice, type DiscountType } from "@/lib/invoice-calc";
import { formatMoney, percentToBp, toCents } from "@/lib/money";
import type { InvoiceDraftInput } from "@/lib/validation";
import { saveInvoiceDraft } from "./actions";

type ClientOption = { id: string; name: string; email: string | null; currency: string | null };
type Item = InvoiceDraftInput["items"][number] & { key: number };

let nextKey = 1;
const newItem = (taxRate: string): Item => ({
  key: nextKey++,
  description: "",
  quantity: "1",
  unitPrice: "",
  taxRate,
});

export function InvoiceForm({
  id,
  clients,
  defaults,
  defaultCurrency,
  defaultTaxRate,
}: {
  id: string | null;
  clients: ClientOption[];
  defaults: InvoiceDraftInput;
  defaultCurrency: string;
  defaultTaxRate: string;
}) {
  const [form, setForm] = useState(() => ({ ...defaults, items: undefined }));
  const [items, setItems] = useState<Item[]>(() =>
    defaults.items.length
      ? defaults.items.map((i) => ({ ...i, key: nextKey++ }))
      : [newItem(defaultTaxRate)],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setItem = (key: number, patch: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  // Live preview — invalid inputs count as zero; the server re-validates on save.
  const totals = useMemo(
    () =>
      calculateInvoice({
        items: items.map((i) => ({
          quantity: i.quantity,
          unitPriceCents: toCents(i.unitPrice) ?? 0,
          taxRateBp: percentToBp(i.taxRate || "0") ?? 0,
        })),
        discountType: form.discountType,
        discountValue:
          form.discountType === "percent"
            ? (percentToBp(form.discountValue || "0") ?? 0)
            : (toCents(form.discountValue || "0") ?? 0),
      }),
    [items, form.discountType, form.discountValue],
  );

  const currency = /^[A-Za-z]{3}$/.test(form.currency) ? form.currency.toUpperCase() : defaultCurrency;
  const fmt = (cents: number) => formatMoney(cents, currency);
  const err = (k: string) => errors[k];
  const a11y = (k: string) => ({
    "aria-invalid": !!err(k),
    "aria-describedby": err(k) ? `${k}-error` : undefined,
  });

  function onClientChange(clientId: string) {
    set("clientId", clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client?.currency) set("currency", client.currency);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: InvoiceDraftInput = {
      ...form,
      items: items.map(({ description, quantity, unitPrice, taxRate }) => ({
        description,
        quantity,
        unitPrice,
        taxRate,
      })),
    };
    startTransition(async () => {
      const result = await saveInvoiceDraft(id, payload);
      // On success the action redirects; we only get here with errors.
      setErrors(result?.errors ?? {});
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8" noValidate>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="clientId" label="Client" error={err("clientId")} className="sm:col-span-2">
          <NativeSelect
            id="clientId"
            value={form.clientId}
            onChange={(e) => onClientChange(e.target.value)}
            {...a11y("clientId")}
          >
            <option value="">Choose a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.email ? ` — ${c.email}` : ""}
              </option>
            ))}
          </NativeSelect>
          {clients.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No clients yet.{" "}
              <Link href="/clients/new" className="underline">
                Add one first
              </Link>
              .
            </p>
          )}
        </Field>
        <Field id="currency" label="Currency" error={err("currency")}>
          <Input
            id="currency"
            maxLength={3}
            value={form.currency}
            onChange={(e) => set("currency", e.target.value.toUpperCase())}
            {...a11y("currency")}
          />
        </Field>
        <div />
        <Field id="issueDate" label="Issue date" error={err("issueDate")}>
          <Input
            id="issueDate"
            type="date"
            value={form.issueDate}
            onChange={(e) => set("issueDate", e.target.value)}
            {...a11y("issueDate")}
          />
        </Field>
        <Field id="dueDate" label="Due date" error={err("dueDate")}>
          <Input
            id="dueDate"
            type="date"
            value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
            {...a11y("dueDate")}
          />
        </Field>
      </section>

      <section className="grid gap-3">
        <h2 className="font-medium">Line items</h2>
        {err("items") && <p className="text-sm text-destructive">{err("items")}</p>}
        <div className="grid gap-3">
          {items.map((item, idx) => {
            const k = (f: string) => `items.${idx}.${f}`;
            return (
              <fieldset
                key={item.key}
                className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_6rem_8rem_6rem_7rem_auto] sm:items-start sm:border-0 sm:p-0"
              >
                <legend className="sr-only">Line {idx + 1}</legend>
                <Field id={k("description")} label={<span className="sm:sr-only">Description</span>} error={err(k("description"))} className="col-span-2 sm:col-span-1">
                  <Input
                    id={k("description")}
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => setItem(item.key, { description: e.target.value })}
                    {...a11y(k("description"))}
                  />
                </Field>
                <Field id={k("quantity")} label={<span className="sm:sr-only">Qty</span>} error={err(k("quantity"))}>
                  <Input
                    id={k("quantity")}
                    inputMode="decimal"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => setItem(item.key, { quantity: e.target.value })}
                    {...a11y(k("quantity"))}
                  />
                </Field>
                <Field id={k("unitPrice")} label={<span className="sm:sr-only">Unit price</span>} error={err(k("unitPrice"))}>
                  <Input
                    id={k("unitPrice")}
                    inputMode="decimal"
                    placeholder="Unit price"
                    value={item.unitPrice}
                    onChange={(e) => setItem(item.key, { unitPrice: e.target.value })}
                    {...a11y(k("unitPrice"))}
                  />
                </Field>
                <Field id={k("taxRate")} label={<span className="sm:sr-only">Tax %</span>} error={err(k("taxRate"))}>
                  <Input
                    id={k("taxRate")}
                    inputMode="decimal"
                    placeholder="Tax %"
                    value={item.taxRate}
                    onChange={(e) => setItem(item.key, { taxRate: e.target.value })}
                    {...a11y(k("taxRate"))}
                  />
                </Field>
                <p className="self-center text-right text-sm tabular-nums sm:pt-1.5">
                  {fmt(totals.lines[idx]?.lineSubtotalCents ?? 0)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove line ${idx + 1}`}
                  disabled={items.length === 1}
                  onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))}
                  className="justify-self-end"
                >
                  <Trash2 className="size-4" />
                </Button>
              </fieldset>
            );
          })}
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setItems((list) => [...list, newItem(defaultTaxRate)])}
          >
            <Plus className="size-4" /> Add line
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="discountType" label="Discount">
              <NativeSelect
                id="discountType"
                value={form.discountType}
                onChange={(e) => set("discountType", e.target.value as DiscountType)}
              >
                <option value="none">No discount</option>
                <option value="percent">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </NativeSelect>
            </Field>
            {form.discountType !== "none" && (
              <Field
                id="discountValue"
                label={form.discountType === "percent" ? "Discount %" : `Discount (${currency})`}
                error={err("discountValue")}
              >
                <Input
                  id="discountValue"
                  inputMode="decimal"
                  value={form.discountValue}
                  onChange={(e) => set("discountValue", e.target.value)}
                  {...a11y("discountValue")}
                />
              </Field>
            )}
          </div>
          <Field id="notes" label="Notes (shown on invoice)" error={err("notes")}>
            <Textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
          <Field id="terms" label="Terms (shown on invoice)" error={err("terms")}>
            <Textarea
              id="terms"
              rows={2}
              value={form.terms}
              onChange={(e) => set("terms", e.target.value)}
            />
          </Field>
        </div>

        <dl className="grid h-fit gap-2 rounded-lg border p-4 text-sm" aria-live="polite">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{fmt(totals.subtotalCents)}</dd>
          </div>
          {totals.discountCents > 0 && (
            <div className="flex justify-between">
              <dt>Discount</dt>
              <dd className="tabular-nums">−{fmt(totals.discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Tax</dt>
            <dd className="tabular-nums">{fmt(totals.taxCents)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{fmt(totals.totalCents)}</dd>
          </div>
        </dl>
      </section>

      {err("_form") && (
        <p role="alert" className="text-sm text-destructive">
          {err("_form")}
        </p>
      )}
      {Object.keys(errors).length > 0 && !err("_form") && (
        <p role="alert" className="text-sm text-destructive">
          Please fix the highlighted fields.
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save draft"}
        </Button>
        <Link href={id ? `/invoices/${id}` : "/invoices"} className="self-center text-sm underline-offset-4 hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
