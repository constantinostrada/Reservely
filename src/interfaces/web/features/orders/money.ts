/**
 * Money crosses the wire as integer cents (the backend never sends floats).
 * The UI is the only place that turns cents into a human currency string, so
 * this is the single formatter every ordering/bill view uses.
 */

/** Format an integer-cent amount as currency, e.g. 2350 + "USD" → "$23.50". */
export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/**
 * Parse a currency amount typed in major units (e.g. "5" or "5.50") into
 * integer cents. Returns 0 for blank/invalid input so an empty tip field is
 * simply no tip. Rounds to the nearest cent to avoid float drift.
 */
export function parseMoneyToCents(value: string): number {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }
  return Math.round(amount * 100);
}
