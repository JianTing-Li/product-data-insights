import { describe, expect, it } from 'vitest'
import { mapColumns } from './mapColumns'

function mappingFor(mappings: ReturnType<typeof mapColumns>, field: string) {
  return mappings.find((m) => m.field === field)
}

describe('mapColumns', () => {
  it('maps canonical labels with high confidence', () => {
    const headers = ['Order ID', 'Order date', 'Product ID or SKU', 'Quantity', 'Selling price']
    // "Product ID or SKU" won't exact-match any alias, but should still resolve via partial match.
    const mappings = mapColumns(headers, 'sales')
    expect(mappingFor(mappings, 'orderId')).toMatchObject({ sourceColumn: 'Order ID', confidence: 'high' })
    expect(mappingFor(mappings, 'orderDate')).toMatchObject({ sourceColumn: 'Order date', confidence: 'high' })
    expect(mappingFor(mappings, 'quantity')).toMatchObject({ sourceColumn: 'Quantity', confidence: 'high' })
    expect(mappingFor(mappings, 'sellingPrice')).toMatchObject({ sourceColumn: 'Selling price', confidence: 'high' })
  })

  it('maps snake_case headers with high confidence', () => {
    const headers = ['order_id', 'order_date', 'sku', 'quantity', 'selling_price', 'product_cost']
    const mappings = mapColumns(headers, 'sales')
    for (const field of ['orderId', 'orderDate', 'sku', 'quantity', 'sellingPrice', 'productCost']) {
      expect(mappingFor(mappings, field)?.confidence).toBe('high')
    }
  })

  it('maps the Amazon-style product CSV headers generically', () => {
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
      'user_id',
      'user_name',
      'review_id',
      'review_title',
      'review_content',
      'img_link',
      'product_link',
    ]
    const mappings = mapColumns(headers, 'products')
    expect(mappingFor(mappings, 'sku')).toMatchObject({ sourceColumn: 'product_id', confidence: 'high' })
    expect(mappingFor(mappings, 'productName')).toMatchObject({ sourceColumn: 'product_name', confidence: 'high' })
    expect(mappingFor(mappings, 'category')).toMatchObject({ sourceColumn: 'category', confidence: 'high' })
    expect(mappingFor(mappings, 'currentPrice')).toMatchObject({ sourceColumn: 'discounted_price', confidence: 'high' })
    expect(mappingFor(mappings, 'originalPrice')).toMatchObject({ sourceColumn: 'actual_price', confidence: 'high' })
    expect(mappingFor(mappings, 'rating')).toMatchObject({ sourceColumn: 'rating', confidence: 'high' })
    expect(mappingFor(mappings, 'ratingCount')).toMatchObject({ sourceColumn: 'rating_count', confidence: 'high' })
    expect(mappingFor(mappings, 'description')).toMatchObject({ sourceColumn: 'about_product', confidence: 'high' })
    expect(mappingFor(mappings, 'reviewText')).toMatchObject({ sourceColumn: 'review_content', confidence: 'high' })
    expect(mappingFor(mappings, 'imageUrl')).toMatchObject({ sourceColumn: 'img_link', confidence: 'high' })
    expect(mappingFor(mappings, 'productUrl')).toMatchObject({ sourceColumn: 'product_link', confidence: 'high' })
    // Brand has no corresponding column in this dataset and must not be forced onto an unrelated header.
    expect(mappingFor(mappings, 'brand')).toMatchObject({ sourceColumn: null, confidence: 'none' })
  })

  it('fuzzy-matches near-miss spellings at low confidence', () => {
    const headers = ['Order ID', 'Order date', 'sku', 'Quantiy', 'Selling price']
    const mappings = mapColumns(headers, 'sales')
    expect(mappingFor(mappings, 'quantity')).toMatchObject({ sourceColumn: 'Quantiy', confidence: 'low' })
  })

  it('leaves fields unmapped when no plausible column exists', () => {
    const headers = ['foo', 'bar', 'baz']
    const mappings = mapColumns(headers, 'sales')
    for (const m of mappings) {
      expect(m.sourceColumn).toBeNull()
      expect(m.confidence).toBe('none')
    }
  })

  it('never assigns the same source column to two different fields', () => {
    const headers = ['sku', 'price']
    const mappings = mapColumns(headers, 'products')
    const usedColumns = mappings.filter((m) => m.sourceColumn).map((m) => m.sourceColumn)
    expect(new Set(usedColumns).size).toBe(usedColumns.length)
  })

  it('supports multiple warehouse inventory headers', () => {
    const headers = ['SKU', 'Warehouse', 'Available Quantity', 'Reserved Quantity', 'Reorder Point']
    const mappings = mapColumns(headers, 'inventory')
    expect(mappingFor(mappings, 'sku')).toMatchObject({ sourceColumn: 'SKU', confidence: 'high' })
    expect(mappingFor(mappings, 'warehouse')).toMatchObject({ sourceColumn: 'Warehouse', confidence: 'high' })
    expect(mappingFor(mappings, 'availableInventory')).toMatchObject({
      sourceColumn: 'Available Quantity',
      confidence: 'high',
    })
    expect(mappingFor(mappings, 'reservedInventory')).toMatchObject({
      sourceColumn: 'Reserved Quantity',
      confidence: 'high',
    })
    expect(mappingFor(mappings, 'reorderLevel')).toMatchObject({ sourceColumn: 'Reorder Point', confidence: 'high' })
  })
})
