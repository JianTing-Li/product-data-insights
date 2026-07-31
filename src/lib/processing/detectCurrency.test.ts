import { describe, expect, it } from 'vitest'
import { detectCurrency, detectCurrencyFromRecords, sniffCurrencySymbol } from './detectCurrency'
import type { SalesRecord } from './types'

function sale(currency?: string): SalesRecord {
  return { orderId: 'O1', orderDate: null, sku: 'A', quantity: 1, sellingPrice: 10, currency }
}

describe('detectCurrency', () => {
  it('defaults to USD when no currency column is present', () => {
    expect(detectCurrency([sale(), sale()])).toBe('USD')
  })

  it('detects an explicit ISO code', () => {
    expect(detectCurrency([sale('INR'), sale('INR')])).toBe('INR')
  })

  it('is case-insensitive', () => {
    expect(detectCurrency([sale('inr')])).toBe('INR')
  })

  it('maps a currency symbol to its ISO code', () => {
    expect(detectCurrency([sale('₹')])).toBe('INR')
  })

  it('picks the most frequent currency when mixed', () => {
    expect(detectCurrency([sale('USD'), sale('INR'), sale('INR')])).toBe('INR')
  })

  it('ignores unrecognized values', () => {
    expect(detectCurrency([sale('not-a-currency')])).toBe('USD')
  })
})

describe('detectCurrencyFromRecords', () => {
  it('returns null (not USD) when nothing is detected, so callers can chain a fallback', () => {
    expect(detectCurrencyFromRecords([sale(), sale()])).toBeNull()
  })

  it('works on plain objects with just a currency field (e.g. product records)', () => {
    expect(detectCurrencyFromRecords([{ currency: 'MXN' }, { currency: 'MXN' }, { currency: 'USD' }])).toBe('MXN')
  })
})

describe('sniffCurrencySymbol', () => {
  it('detects the rupee symbol embedded in a price string', () => {
    expect(sniffCurrencySymbol('₹1,099')).toBe('INR')
  })

  it('detects other known symbols', () => {
    expect(sniffCurrencySymbol('$22.90')).toBe('USD')
    expect(sniffCurrencySymbol('€19.99')).toBe('EUR')
    expect(sniffCurrencySymbol('฿350')).toBe('THB')
  })

  it('returns null when no known symbol is present', () => {
    expect(sniffCurrencySymbol('1099')).toBeNull()
  })

  it('returns null for missing input', () => {
    expect(sniffCurrencySymbol(undefined)).toBeNull()
    expect(sniffCurrencySymbol(null)).toBeNull()
    expect(sniffCurrencySymbol('')).toBeNull()
  })
})
