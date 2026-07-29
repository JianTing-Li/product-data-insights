import { describe, expect, it } from 'vitest'
import { deduplicateProducts } from './aggregateProducts'
import type { ProductRecord } from './types'

function product(overrides: Partial<ProductRecord> & { sku: string }): ProductRecord {
  return { productName: 'Widget', ...overrides }
}

describe('deduplicateProducts', () => {
  it('keeps one record per distinct SKU', () => {
    const { products } = deduplicateProducts([product({ sku: 'A' }), product({ sku: 'B' })])
    expect(products).toHaveLength(2)
  })

  it('deduplicates identical repeated rows without flagging a conflict', () => {
    const record = product({ sku: 'A', currentPrice: 9.99 })
    const { products, conflicts } = deduplicateProducts([record, { ...record }])
    expect(products).toHaveLength(1)
    expect(conflicts).toHaveLength(0)
  })

  it('flags differing field values across duplicate SKUs as a conflict', () => {
    const { products, conflicts } = deduplicateProducts([
      product({ sku: 'A', currentPrice: 9.99, rating: 4.0 }),
      product({ sku: 'A', currentPrice: 12.99, rating: 4.0 }),
    ])
    expect(products).toHaveLength(1)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].fields).toContain('currentPrice')
    expect(conflicts[0].fields).not.toContain('rating')
  })

  it('keeps the first-occurrence record as canonical', () => {
    const { products } = deduplicateProducts([
      product({ sku: 'A', productName: 'First Name' }),
      product({ sku: 'A', productName: 'Second Name' }),
    ])
    expect(products[0].productName).toBe('First Name')
  })

  it('never merges different SKUs even when names are identical', () => {
    const { products, conflicts } = deduplicateProducts([
      product({ sku: 'A', productName: 'Blue Widget' }),
      product({ sku: 'B', productName: 'Blue Widget' }),
    ])
    expect(products).toHaveLength(2)
    expect(conflicts).toHaveLength(0)
  })

  it('preserves conflicting records for inspection rather than discarding them', () => {
    const recordA = product({ sku: 'A', currentPrice: 9.99 })
    const recordB = product({ sku: 'A', currentPrice: 12.99 })
    const { conflicts } = deduplicateProducts([recordA, recordB])
    expect(conflicts[0].records).toEqual([recordA, recordB])
  })
})
