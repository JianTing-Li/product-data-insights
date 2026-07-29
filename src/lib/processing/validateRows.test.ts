import { describe, expect, it } from 'vitest'
import { validateInventoryRows, validateProductRows, validateSalesRows } from './validateRows'
import type { ColumnMapping, RawRow } from './types'

function mapping(field: ColumnMapping['field'], sourceColumn: string): ColumnMapping {
  return { field, sourceColumn, confidence: 'high' }
}

const salesMappings: ColumnMapping[] = [
  mapping('orderId', 'order_id'),
  mapping('orderDate', 'order_date'),
  mapping('sku', 'sku'),
  mapping('quantity', 'quantity'),
  mapping('sellingPrice', 'selling_price'),
  mapping('productCost', 'product_cost'),
  mapping('orderStatus', 'order_status'),
  mapping('discount', 'discount'),
  mapping('currency', 'currency'),
]

function salesRow(overrides: Partial<RawRow> = {}): RawRow {
  return {
    order_id: 'ORD-1',
    order_date: '2026-07-15',
    sku: 'SKU-001',
    quantity: '2',
    selling_price: '12.99',
    product_cost: '6.00',
    order_status: 'Completed',
    discount: '',
    currency: '',
    ...overrides,
  }
}

describe('validateSalesRows', () => {
  it('accepts a clean row', () => {
    const [result] = validateSalesRows([salesRow()], salesMappings, 'file-1')
    expect(result.acceptance).toBe('accepted')
    expect(result.value).toMatchObject({ orderId: 'ORD-1', sku: 'SKU-001', quantity: 2, sellingPrice: 12.99 })
  })

  it('preserves leading zeroes in SKUs', () => {
    const [result] = validateSalesRows([salesRow({ sku: '00123' })], salesMappings, 'file-1')
    expect(result.value?.sku).toBe('00123')
  })

  it('preserves hyphens in SKUs', () => {
    const [result] = validateSalesRows([salesRow({ sku: 'ABC-123-XYZ' })], salesMappings, 'file-1')
    expect(result.value?.sku).toBe('ABC-123-XYZ')
  })

  it('rejects a row missing a required field, with a reason', () => {
    const [result] = validateSalesRows([salesRow({ order_id: '' })], salesMappings, 'file-1')
    expect(result.acceptance).toBe('rejected')
    expect(result.value).toBeNull()
    expect(result.issues.some((i) => i.field === 'orderId')).toBe(true)
  })

  it('rejects zero and negative quantities', () => {
    expect(validateSalesRows([salesRow({ quantity: '0' })], salesMappings, 'file-1')[0].acceptance).toBe('rejected')
    expect(validateSalesRows([salesRow({ quantity: '-1' })], salesMappings, 'file-1')[0].acceptance).toBe('rejected')
  })

  it('rejects unparseable prices', () => {
    const [result] = validateSalesRows([salesRow({ selling_price: 'contact us' })], salesMappings, 'file-1')
    expect(result.acceptance).toBe('rejected')
    expect(result.issues.some((i) => i.field === 'sellingPrice')).toBe(true)
  })

  it('rejects invalid dates', () => {
    const [result] = validateSalesRows([salesRow({ order_date: 'not-a-date' })], salesMappings, 'file-1')
    expect(result.acceptance).toBe('rejected')
    expect(result.issues.some((i) => i.field === 'orderDate')).toBe(true)
  })

  it('accepts with a warning when an optional field fails to parse', () => {
    const [result] = validateSalesRows([salesRow({ product_cost: 'oops' })], salesMappings, 'file-1')
    expect(result.acceptance).toBe('warning')
    expect(result.value?.sellingPrice).toBe(12.99)
    expect(result.value?.productCost).toBeUndefined()
  })

  it('flags every row with a warning when the date format is ambiguous', () => {
    const rows = [salesRow({ order_date: '03/04/2026' }), salesRow({ order_id: 'ORD-2', order_date: '01/02/2026' })]
    const results = validateSalesRows(rows, salesMappings, 'file-1')
    expect(results.every((r) => r.acceptance === 'warning')).toBe(true)
    expect(results[0].issues.some((i) => i.field === 'orderDate' && i.message.includes('ambiguous'))).toBe(true)
  })

  it('does not warn about date format when it is unambiguous', () => {
    const rows = [salesRow({ order_date: '25/03/2026' }), salesRow({ order_id: 'ORD-2', order_date: '03/04/2026' })]
    const results = validateSalesRows(rows, salesMappings, 'file-1')
    expect(results.every((r) => r.acceptance === 'accepted')).toBe(true)
  })
})

const productMappings: ColumnMapping[] = [
  mapping('sku', 'product_id'),
  mapping('productName', 'product_name'),
  mapping('category', 'category'),
  mapping('currentPrice', 'current_price'),
  mapping('rating', 'rating'),
  mapping('ratingCount', 'rating_count'),
]

describe('validateProductRows', () => {
  it('accepts a clean row', () => {
    const rows: RawRow[] = [
      { product_id: 'SKU-1', product_name: 'Widget', category: 'Home', current_price: '9.99', rating: '4.5', rating_count: '100' },
    ]
    const [result] = validateProductRows(rows, productMappings, 'file-1')
    expect(result.acceptance).toBe('accepted')
    expect(result.value?.productName).toBe('Widget')
  })

  it('rejects a row missing the required product name', () => {
    const rows: RawRow[] = [{ product_id: 'SKU-1', product_name: '', category: '', current_price: '', rating: '', rating_count: '' }]
    const [result] = validateProductRows(rows, productMappings, 'file-1')
    expect(result.acceptance).toBe('rejected')
  })

  it('does not merge distinct products based on similar names — each row keeps its own SKU', () => {
    const rows: RawRow[] = [
      { product_id: 'SKU-1', product_name: 'Blue Widget', category: '', current_price: '', rating: '', rating_count: '' },
      { product_id: 'SKU-2', product_name: 'Blue Widget', category: '', current_price: '', rating: '', rating_count: '' },
    ]
    const results = validateProductRows(rows, productMappings, 'file-1')
    expect(results.map((r) => r.value?.sku)).toEqual(['SKU-1', 'SKU-2'])
  })
})

const inventoryMappings: ColumnMapping[] = [
  mapping('sku', 'sku'),
  mapping('warehouse', 'warehouse'),
  mapping('availableInventory', 'available'),
  mapping('reservedInventory', 'reserved'),
]

describe('validateInventoryRows', () => {
  it('accepts zero available inventory (legitimately out of stock)', () => {
    const rows: RawRow[] = [{ sku: 'SKU-1', warehouse: 'WH-1', available: '0', reserved: '0' }]
    const [result] = validateInventoryRows(rows, inventoryMappings, 'file-1')
    expect(result.acceptance).toBe('accepted')
    expect(result.value?.availableInventory).toBe(0)
  })

  it('rejects negative inventory', () => {
    const rows: RawRow[] = [{ sku: 'SKU-1', warehouse: 'WH-1', available: '-5', reserved: '0' }]
    const [result] = validateInventoryRows(rows, inventoryMappings, 'file-1')
    expect(result.acceptance).toBe('rejected')
  })

  it('keeps separate rows for the same SKU across warehouses', () => {
    const rows: RawRow[] = [
      { sku: 'SKU-1', warehouse: 'WH-EAST', available: '10', reserved: '0' },
      { sku: 'SKU-1', warehouse: 'WH-WEST', available: '20', reserved: '0' },
    ]
    const results = validateInventoryRows(rows, inventoryMappings, 'file-1')
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.acceptance === 'accepted')).toBe(true)
  })
})
