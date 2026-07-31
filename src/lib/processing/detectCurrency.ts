const SYMBOL_TO_CODE: Record<string, string> = {
  '₹': 'INR',
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₩': 'KRW',
  '₽': 'RUB',
  '฿': 'THB',
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

/** Scans a raw price string (e.g. "₹1,099") for a known currency symbol and
 * returns its ISO code, or null if none is found. Used as a fallback when a
 * dataset has no dedicated currency column but embeds the symbol directly
 * in price values — a shape real exports (e.g. Kaggle-style Amazon data)
 * commonly use. */
export function sniffCurrencySymbol(raw: string | null | undefined): string | null {
  if (!raw) return null
  for (const [symbol, code] of Object.entries(SYMBOL_TO_CODE)) {
    if (raw.includes(symbol)) return code
  }
  return null
}
