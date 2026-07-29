import { describe, expect, it } from 'vitest'
import { detectDateFormat, parseDate } from './dateParsers'

describe('detectDateFormat', () => {
  it('detects ISO format', () => {
    const result = detectDateFormat(['2026-07-15', '2026-07-16'])
    expect(result.format).toBe('iso')
    expect(result.ambiguous).toBe(false)
  })

  it('detects DD/MM/YYYY when a day component exceeds 12', () => {
    const result = detectDateFormat(['25/03/2026', '03/04/2026'])
    expect(result.format).toBe('dmy')
    expect(result.ambiguous).toBe(false)
  })

  it('detects MM/DD/YYYY when a month-position component exceeds 12', () => {
    const result = detectDateFormat(['03/25/2026', '04/03/2026'])
    expect(result.format).toBe('mdy')
    expect(result.ambiguous).toBe(false)
  })

  it('flags ambiguous when no value disambiguates day vs month', () => {
    const result = detectDateFormat(['03/04/2026', '01/02/2026'])
    expect(result.ambiguous).toBe(true)
  })

  it('ignores missing values when scanning the sample', () => {
    const result = detectDateFormat(['', 'N/A', '2026-07-15'])
    expect(result.format).toBe('iso')
  })
})

describe('parseDate', () => {
  it('parses ISO dates', () => {
    const date = parseDate('2026-07-15', 'iso')
    expect(date?.toISOString().slice(0, 10)).toBe('2026-07-15')
  })

  it('parses MM/DD/YYYY under mdy format', () => {
    const date = parseDate('07/15/2026', 'mdy')
    expect(date?.toISOString().slice(0, 10)).toBe('2026-07-15')
  })

  it('parses DD/MM/YYYY under dmy format', () => {
    const date = parseDate('15/07/2026', 'dmy')
    expect(date?.toISOString().slice(0, 10)).toBe('2026-07-15')
  })

  it('parses textual month names', () => {
    const date = parseDate('July 15, 2026', 'mdy')
    expect(date?.toISOString().slice(0, 10)).toBe('2026-07-15')
  })

  it('returns null for an invalid date like Feb 30', () => {
    expect(parseDate('2026-02-30', 'iso')).toBeNull()
  })

  it('returns null for unparseable text', () => {
    expect(parseDate('not-a-date', 'mdy')).toBeNull()
  })

  it('returns null for missing values', () => {
    expect(parseDate('', 'mdy')).toBeNull()
    expect(parseDate(undefined, 'mdy')).toBeNull()
  })
})
