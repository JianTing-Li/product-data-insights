import { describe, expect, it } from 'vitest'
import { detectDatasetKind } from './detectDatasetKind'

describe('detectDatasetKind', () => {
  it('detects a sales file with high confidence', () => {
    const headers = ['order_id', 'order_date', 'sku', 'quantity', 'selling_price']
    const result = detectDatasetKind(headers)
    expect(result.kind).toBe('sales')
    expect(result.confidence).toBe('high')
  })

  it('detects a products file with high confidence', () => {
    const headers = ['product_id', 'product_name', 'category', 'brand', 'current_price', 'rating']
    const result = detectDatasetKind(headers)
    expect(result.kind).toBe('products')
    expect(result.confidence).toBe('high')
  })

  it('detects the Amazon-style product catalog headers as products with high confidence', () => {
    const headers = [
      'product_id',
      'product_name',
      'category',
      'discounted_price',
      'actual_price',
      'discount_percentage',
      'rating',
      'rating_count',
      'about_product',
      'review_content',
      'img_link',
      'product_link',
    ]
    const result = detectDatasetKind(headers)
    expect(result.kind).toBe('products')
    expect(result.confidence).toBe('high')
  })

  it('detects an inventory file with high confidence', () => {
    const headers = ['sku', 'warehouse', 'available_inventory', 'reserved_inventory']
    const result = detectDatasetKind(headers)
    expect(result.kind).toBe('inventory')
    expect(result.confidence).toBe('high')
  })

  it('returns low confidence for headers that do not resemble any dataset', () => {
    const headers = ['foo', 'bar', 'baz']
    const result = detectDatasetKind(headers)
    expect(result.confidence).toBe('low')
  })

  it('returns low confidence when two dataset kinds are nearly equally plausible', () => {
    // Only a bare "sku" column is genuinely shared, but nothing distinguishes sales vs inventory here.
    const headers = ['sku']
    const result = detectDatasetKind(headers)
    expect(result.confidence).not.toBe('high')
  })
})
