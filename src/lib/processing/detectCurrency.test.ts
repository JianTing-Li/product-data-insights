import { describe, expect, it } from 'vitest'
import { detectCurrency } from './detectCurrency'
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
