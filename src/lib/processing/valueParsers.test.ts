import { describe, expect, it } from 'vitest'
import { parseCurrency, parseNonNegativeInteger, parseNumber, parsePercent, parseQuantity } from './valueParsers'

describe('parseCurrency', () => {
  it('parses a plain decimal', () => {
    expect(parseCurrency('12.99').value).toBeCloseTo(12.99)
  })

  it('strips a dollar sign', () => {
    expect(parseCurrency('$12.99').value).toBeCloseTo(12.99)
  })

  it('strips a rupee sign with thousands grouping', () => {
    expect(parseCurrency('₹1,099').value).toBeCloseTo(1099)
  })

  it('handles Indian lakh-style grouping', () => {
    expect(parseCurrency('₹1,00,000').value).toBeCloseTo(100000)
  })

  it('resolves European format (dot thousands, comma decimal)', () => {
    expect(parseCurrency('1.234,56').value).toBeCloseTo(1234.56)
  })

  it('resolves US format (comma thousands, dot decimal)', () => {
    expect(parseCurrency('1,234.56').value).toBeCloseTo(1234.56)
  })

  it('treats a lone 2-digit comma as a decimal separator', () => {
    expect(parseCurrency('12,50').value).toBeCloseTo(12.5)
  })

  it('treats a lone 3-digit comma as thousands grouping', () => {
    expect(parseCurrency('1,234').value).toBeCloseTo(1234)
  })

  it('parses parenthesized values as negative', () => {
    expect(parseCurrency('(12.99)').value).toBeCloseTo(-12.99)
  })

  it('parses a leading minus sign as negative', () => {
    expect(parseCurrency('-12.99').value).toBeCloseTo(-12.99)
  })

  it('strips a currency code', () => {
    expect(parseCurrency('USD 12.99').value).toBeCloseTo(12.99)
  })

  it('returns null with an issue for unparseable text', () => {
    const result = parseCurrency('contact us')
    expect(result.value).toBeNull()
    expect(result.issue).toBeTruthy()
  })

  it('treats missing-value tokens as absent, not an error', () => {
    expect(parseCurrency('').issue).toBeUndefined()
    expect(parseCurrency('N/A').value).toBeNull()
    expect(parseCurrency('N/A').issue).toBeUndefined()
  })
})

describe('parsePercent', () => {
  it('parses a percent sign into a 0-1 fraction', () => {
    expect(parsePercent('64%').value).toBeCloseTo(0.64)
  })

  it('treats a bare fraction as already-a-fraction', () => {
    expect(parsePercent('0.1').value).toBeCloseTo(0.1)
  })

  it('treats a bare whole number as a percent', () => {
    expect(parsePercent('10').value).toBeCloseTo(0.1)
  })
})

describe('parseQuantity', () => {
  it('parses a positive integer', () => {
    expect(parseQuantity('3').value).toBe(3)
  })

  it('rejects zero', () => {
    const result = parseQuantity('0')
    expect(result.value).toBeNull()
    expect(result.issue).toBeTruthy()
  })

  it('rejects negative numbers', () => {
    expect(parseQuantity('-2').value).toBeNull()
  })

  it('rejects non-numeric text', () => {
    expect(parseQuantity('N/A').value).toBeNull()
  })

  it('rejects fractional values', () => {
    expect(parseQuantity('2.5').value).toBeNull()
  })
})

describe('parseNonNegativeInteger', () => {
  it('accepts zero', () => {
    expect(parseNonNegativeInteger('0').value).toBe(0)
  })

  it('rejects negative numbers', () => {
    expect(parseNonNegativeInteger('-5').value).toBeNull()
  })
})

describe('parseNumber', () => {
  it('parses a rating count with thousands grouping', () => {
    expect(parseNumber('24,269').value).toBe(24269)
  })

  it('parses a plain decimal rating', () => {
    expect(parseNumber('4.2').value).toBeCloseTo(4.2)
  })
})
