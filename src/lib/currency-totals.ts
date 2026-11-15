/** An amount in one currency. Totals are kept per currency; we never convert. */
export type CurrencyTotal = { currency: string; cents: number };

/**
 * Business default currency first, then the rest alphabetically. Zero totals
 * are dropped, but the default currency always appears (as 0 if nothing else)
 * so a card never renders empty.
 */
export function orderTotals(totals: CurrencyTotal[], defaultCurrency: string): CurrencyTotal[] {
  const nonZero = totals.filter((t) => t.cents !== 0);
  const primary = nonZero.find((t) => t.currency === defaultCurrency) ?? {
    currency: defaultCurrency,
    cents: 0,
  };
  const others = nonZero
    .filter((t) => t.currency !== defaultCurrency)
    .sort((a, b) => a.currency.localeCompare(b.currency));
  return [primary, ...others];
}
