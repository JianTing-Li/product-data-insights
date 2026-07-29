const MISSING_TOKENS = new Set(['', 'n/a', 'na', 'null', 'none', 'nil', '-', '--', '—', 'unknown', '#n/a'])

/** Normalizes common "missing value" spellings (blank, N/A, null, em-dash,
 * etc.) to a single canonical `null`, so downstream parsers only need to
 * handle one "absent" case instead of re-deriving this list everywhere. */
export function normalizeMissing(raw: string | undefined | null): string | null {
  if (raw === undefined || raw === null) return null
  const trimmed = raw.trim()
  if (MISSING_TOKENS.has(trimmed.toLowerCase())) return null
  return trimmed
}
