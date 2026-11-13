/**
 * Money helpers. All amounts are integer minor units ("cents"); we never do
 * arithmetic on floating-point currency values.
 */

/**
 * Parse user input like "1,234.5" or "12" into integer cents.
 * Returns null for anything that isn't a plain non-negative decimal with ≤ 2 places.
 */
export function toCents(input: string | number): number | null {
  const s = String(input).trim().replace(/,/g, "");
  const m = /^(\d+)(?:\.(\d{0,2}))?$/.exec(s);
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Cents → plain decimal string for form inputs, e.g. 123456 → "1234.56". */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Format cents for display in the given ISO currency, e.g. "$1,234.56". */
export function formatMoney(cents: number, currency: string, locale = "en-US"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  } catch {
    // Unknown currency code: fall back to a plain number with the code.
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

/** Basis points → percentage string, e.g. 1500 → "15", 750 → "7.5". */
export function bpToPercent(bp: number): string {
  return String(bp / 100);
}

/** Percentage input ("7.5") → basis points (750). Null if invalid or outside 0–100. */
export function percentToBp(input: string | number): number | null {
  const s = String(input).trim();
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const bp = Math.round(Number(s) * 100);
  return bp >= 0 && bp <= 10_000 ? bp : null;
}
