const SYMBOL_TO_CODE: Record<string, string> = {
  '₹': 'INR',
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
}

const VALID_CODE_RE = /^[A-Z]{3}$/

function normalize(raw: string): string | null {
  const trimmed = raw.trim()
  if (SYMBOL_TO_CODE[trimmed]) return SYMBOL_TO_CODE[trimmed]
  const upper = trimmed.toUpperCase()
  return VALID_CODE_RE.test(upper) ? upper : null
}

/** Finds the most common currency across any records with an optional
 * `currency` field (sales or product rows), or null if none had usable
 * currency information. Exposed separately from detectCurrency so callers
 * can chain multiple sources with their own final fallback. */
export function detectCurrencyFromRecords(records: { currency?: string }[]): string | null {
  const counts = new Map<string, number>()
  for (const record of records) {
    if (!record.currency) continue
    const code = normalize(record.currency)
    if (!code) continue
    counts.set(code, (counts.get(code) ?? 0) + 1)
  }

  let best: string | null = null
  let bestCount = 0
  for (const [code, count] of counts) {
    if (count > bestCount) {
      best = code
      bestCount = count
    }
  }

  return best
}

/** Detects which currency the sales data is denominated in from the
 * optional `currency` column, so amounts aren't displayed with the wrong
 * symbol. Falls back to USD when no currency information is present. */
export function detectCurrency(records: { currency?: string }[]): string {
  return detectCurrencyFromRecords(records) ?? 'USD'
}
