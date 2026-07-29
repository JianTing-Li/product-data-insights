import { normalizeMissing } from './normalizeMissing'

export type DateFormat = 'iso' | 'mdy' | 'dmy'

export interface DateFormatDetection {
  format: DateFormat
  /** True when the sample never disambiguated MM/DD vs DD/MM (every
   * candidate day/month component was <= 12) — `format` falls back to 'mdy'
   * but callers should surface this so ambiguous dates aren't parsed as if
   * confidently confirmed. */
  ambiguous: boolean
}

const ISO_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})/
const NUMERIC_RE = /^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/
const MONTH_NAME_RE = /^[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}$/

/** Scans a sample of raw date strings to determine whether the column is
 * ISO, month/day/year, or day/month/year — without assuming any single row
 * is representative. A day or month component seen to exceed 12 anywhere in
 * the sample disambiguates the whole column. */
export function detectDateFormat(values: (string | undefined | null)[]): DateFormatDetection {
  let sawMonthFirst = false // some value's *second* component > 12 => first component must be month
  let sawDayFirst = false // some value's *first* component > 12 => first component must be day
  let anyNumericSlashDash = false

  for (const raw of values) {
    const normalized = normalizeMissing(raw)
    if (normalized === null) continue
    if (ISO_RE.test(normalized)) continue
    if (MONTH_NAME_RE.test(normalized)) continue

    const match = NUMERIC_RE.exec(normalized)
    if (!match) continue
    anyNumericSlashDash = true
    const a = parseInt(match[1], 10)
    const b = parseInt(match[2], 10)
    if (a.toString().length === 4) continue // YYYY/MM/DD already unambiguous (treated as iso-like below)
    if (a > 12) sawDayFirst = true
    if (b > 12) sawMonthFirst = true
  }

  if (!anyNumericSlashDash) return { format: 'iso', ambiguous: false }
  if (sawDayFirst && !sawMonthFirst) return { format: 'dmy', ambiguous: false }
  if (sawMonthFirst && !sawDayFirst) return { format: 'mdy', ambiguous: false }
  if (sawMonthFirst && sawDayFirst) return { format: 'mdy', ambiguous: false } // contradictory sample; best effort
  return { format: 'mdy', ambiguous: true }
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** Parses a single date value given an already-detected column format.
 * Returns null (never throws/guesses) for values that don't fit. */
export function parseDate(raw: string | undefined | null, format: DateFormat): Date | null {
  const normalized = normalizeMissing(raw)
  if (normalized === null) return null

  const isoMatch = ISO_RE.exec(normalized)
  if (isoMatch) {
    return buildUtcDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))
  }

  if (MONTH_NAME_RE.test(normalized)) {
    const cleaned = normalized.replace(',', '')
    const [monthRaw, dayRaw, yearRaw] = cleaned.split(/\s+/)
    const month = MONTH_NAMES[monthRaw.slice(0, 3).toLowerCase()]
    const day = parseInt(dayRaw, 10)
    const year = parseInt(yearRaw, 10)
    if (!month || Number.isNaN(day) || Number.isNaN(year)) return null
    return buildUtcDate(year, month, day)
  }

  const match = NUMERIC_RE.exec(normalized)
  if (!match) return null
  const a = parseInt(match[1], 10)
  const b = parseInt(match[2], 10)
  const c = parseInt(match[3], 10)

  if (match[1].length === 4) {
    return buildUtcDate(a, b, c) // YYYY/MM/DD
  }

  let year: number
  let month: number
  let day: number
  if (format === 'dmy') {
    day = a
    month = b
    year = c
  } else {
    month = a
    day = b
    year = c
  }
  if (year < 100) year += 2000
  return buildUtcDate(year, month, day)
}

function buildUtcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null // rejects overflow like Feb 30
  }
  return date
}
