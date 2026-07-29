import { normalizeMissing } from './normalizeMissing'

export interface ParseResult<T> {
  value: T | null
  issue?: string
}

const CURRENCY_SYMBOLS = ['₹', '$', '€', '£', '¥', '₩', '₽', '฿']
const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CNY']

/** Parses a currency-formatted string into a plain number. Strips known
 * symbols/codes, resolves thousands vs. decimal separators (rightmost
 * separator wins when both appear; a lone separator is treated as decimal
 * only when followed by exactly two digits, otherwise as thousands
 * grouping — this also transparently handles non-Western digit groupings
 * such as Indian lakh-style "1,00,000" since all grouping commas are simply
 * stripped), and supports parenthesized negatives, e.g. "(12.99)". */
export function parseCurrency(raw: string | undefined | null): ParseResult<number> {
  const normalized = normalizeMissing(raw)
  if (normalized === null) return { value: null }

  let s = normalized.trim()
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1)
  }

  for (const symbol of CURRENCY_SYMBOLS) s = s.split(symbol).join('')
  for (const code of CURRENCY_CODES) s = s.replace(new RegExp(`\\b${code}\\b`, 'gi'), '')
  s = s.trim()

  if (s === '') return { value: null, issue: 'Price value is empty after removing currency symbols.' }

  const numeric = resolveNumericSeparators(s)
  if (numeric === null || Number.isNaN(numeric)) {
    return { value: null, issue: `"${normalized}" could not be parsed as a price.` }
  }
  return { value: negative ? -numeric : numeric }
}

/** Resolves a numeric string that may use either US (1,234.56) or European
 * (1.234,56) grouping/decimal conventions into a plain JS number. */
function resolveNumericSeparators(s: string): number | null {
  const negative = /^\s*-/.test(s)
  const cleaned = s.replace(/[^0-9.,]/g, '')
  if (cleaned === '') return null
  const result = resolveUnsignedSeparators(cleaned)
  return result === null ? null : negative ? -result : result
}

function resolveUnsignedSeparators(cleaned: string): number | null {
  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    const decimalSep = lastComma > lastDot ? ',' : '.'
    const thousandsSep = decimalSep === ',' ? '.' : ','
    const withoutThousands = cleaned.split(thousandsSep).join('')
    const normalized = decimalSep === ',' ? withoutThousands.replace(',', '.') : withoutThousands
    return parseFloat(normalized)
  }

  if (hasComma && !hasDot) {
    const parts = cleaned.split(',')
    if (parts.length === 2 && parts[1].length === 2) {
      return parseFloat(`${parts[0]}.${parts[1]}`)
    }
    return parseFloat(parts.join(''))
  }

  if (hasDot && !hasComma) {
    const parts = cleaned.split('.')
    if (parts.length === 2 && parts[1].length === 3) {
      return parseFloat(parts.join(''))
    }
    if (parts.length > 2) {
      const last = parts.pop()
      return parseFloat(parts.join('') + '.' + last)
    }
    return parseFloat(cleaned)
  }

  return parseFloat(cleaned)
}

/** Parses a plain (non-currency) number, supporting the same thousands
 * grouping rules as parseCurrency. Used for rating counts, etc. */
export function parseNumber(raw: string | undefined | null): ParseResult<number> {
  const normalized = normalizeMissing(raw)
  if (normalized === null) return { value: null }
  const numeric = resolveNumericSeparators(normalized.trim())
  if (numeric === null || Number.isNaN(numeric)) {
    return { value: null, issue: `"${normalized}" could not be parsed as a number.` }
  }
  return { value: numeric }
}

/** Parses a quantity: a non-negative integer. Fractional values are rounded
 * only if within floating-point noise of an integer; otherwise rejected. */
export function parseQuantity(raw: string | undefined | null): ParseResult<number> {
  const normalized = normalizeMissing(raw)
  if (normalized === null) return { value: null }
  const numeric = resolveNumericSeparators(normalized.trim())
  if (numeric === null || Number.isNaN(numeric)) {
    return { value: null, issue: `"${normalized}" is not a valid quantity.` }
  }
  const rounded = Math.round(numeric)
  if (Math.abs(numeric - rounded) > 1e-6) {
    return { value: null, issue: `"${normalized}" is not a whole number.` }
  }
  if (rounded <= 0) {
    return { value: null, issue: 'Quantity must be greater than zero.' }
  }
  return { value: rounded }
}

/** Parses an integer count that may legitimately be zero (e.g. available
 * inventory), but not negative. */
export function parseNonNegativeInteger(raw: string | undefined | null): ParseResult<number> {
  const normalized = normalizeMissing(raw)
  if (normalized === null) return { value: null }
  const numeric = resolveNumericSeparators(normalized.trim())
  if (numeric === null || Number.isNaN(numeric)) {
    return { value: null, issue: `"${normalized}" is not a valid number.` }
  }
  const rounded = Math.round(numeric)
  if (Math.abs(numeric - rounded) > 1e-6) {
    return { value: null, issue: `"${normalized}" is not a whole number.` }
  }
  if (rounded < 0) {
    return { value: null, issue: 'Value cannot be negative.' }
  }
  return { value: rounded }
}

/** Parses a percentage into a 0-1 fraction. "64%" -> 0.64. A bare number
 * without "%" is treated as already-a-fraction when <= 1, otherwise as a
 * whole percent (e.g. "10" -> 0.10). */
export function parsePercent(raw: string | undefined | null): ParseResult<number> {
  const normalized = normalizeMissing(raw)
  if (normalized === null) return { value: null }
  const trimmed = normalized.trim()
  const hasSign = trimmed.includes('%')
  const numeric = resolveNumericSeparators(trimmed.replace('%', ''))
  if (numeric === null || Number.isNaN(numeric)) {
    return { value: null, issue: `"${normalized}" could not be parsed as a percentage.` }
  }
  if (hasSign) return { value: numeric / 100 }
  return { value: Math.abs(numeric) <= 1 ? numeric : numeric / 100 }
}
