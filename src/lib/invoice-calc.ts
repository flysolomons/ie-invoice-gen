/**
 * Pure invoice totals. Used by the form for the live preview AND by the server
 * on every save (client-sent totals are never trusted).
 *
 * Rules:
 * - quantity has up to 3 decimals; line subtotal = round(qty × unit price) — the
 *   only rounding point for the line amount.
 * - invoice discount (percent or fixed) is taken off the subtotal and spread
 *   across lines in proportion to their subtotals (largest-remainder, so the
 *   pieces add up exactly), so tax is charged on the discounted amount.
 * - tax is per line: round(discounted line × rate), rounding half up.
 */

export type DiscountType = "none" | "percent" | "fixed";

export type CalcItem = {
  /** Decimal string or number, ≥ 0, up to 3 decimals. */
  quantity: string | number;
  unitPriceCents: number;
  /** Basis points: 1500 = 15%. */
  taxRateBp: number;
};

export type CalcInput = {
  items: CalcItem[];
  discountType: DiscountType;
  /** Basis points for percent, cents for fixed. */
  discountValue: number;
};

export type CalcLine = { lineSubtotalCents: number; lineDiscountCents: number; lineTaxCents: number };

export type CalcResult = {
  lines: CalcLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
};

/** "1.5" → 1500 (thousandths). Null if not a valid non-negative ≤3-decimal number. */
export function quantityToMilli(q: string | number): number | null {
  const s = String(q).trim();
  const m = /^(\d+)(?:\.(\d{0,3}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 1000 + Number((m[2] ?? "").padEnd(3, "0"));
}

/** Round a non-negative rational a/b half-up using integer math. */
function divRound(a: number, b: number): number {
  return Math.floor((2 * a + b) / (2 * b));
}

/** Split `amount` across `weights` proportionally; parts sum exactly to `amount`. */
export function allocate(amount: number, weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  if (amount === 0 || total === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / total);
  const parts = raw.map(Math.floor);
  let remainder = amount - parts.reduce((s, p) => s + p, 0);
  // Hand out leftover cents to the largest fractional parts (stable by index).
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    parts[i] += 1;
    remainder -= 1;
  }
  return parts;
}

export function calculateInvoice(input: CalcInput): CalcResult {
  const subtotals = input.items.map((item) => {
    const milli = quantityToMilli(item.quantity) ?? 0;
    return divRound(milli * Math.max(0, item.unitPriceCents), 1000);
  });
  const subtotalCents = subtotals.reduce((s, v) => s + v, 0);

  let discountCents = 0;
  if (input.discountType === "percent") {
    const bp = Math.min(Math.max(input.discountValue, 0), 10_000);
    discountCents = divRound(subtotalCents * bp, 10_000);
  } else if (input.discountType === "fixed") {
    discountCents = Math.min(Math.max(input.discountValue, 0), subtotalCents);
  }

  const lineDiscounts = allocate(discountCents, subtotals);
  const lines = input.items.map((item, i) => {
    const base = subtotals[i] - lineDiscounts[i];
    const rate = Math.min(Math.max(item.taxRateBp, 0), 10_000);
    return {
      lineSubtotalCents: subtotals[i],
      lineDiscountCents: lineDiscounts[i],
      lineTaxCents: divRound(base * rate, 10_000),
    };
  });
  const taxCents = lines.reduce((s, l) => s + l.lineTaxCents, 0);

  return {
    lines,
    subtotalCents,
    discountCents,
    taxCents,
    totalCents: subtotalCents - discountCents + taxCents,
  };
}
