import { describe, expect, it } from 'vitest'
import { buildProductAttentionTable, buildProductPerformanceTable } from './exportRows'
import type { ProductPerformance, ProductSignal } from './types'

function signal(overrides: Partial<ProductSignal> = {}): ProductSignal {
  return {
    id: 'sales-decline',
    severity: 'high',
    title: 'Sales decline',
    detected: 'Revenue dropped.',
    supportingValues: [{ label: 'Revenue', value: '$100' }],
    whyItMatters: 'Matters.',
    suggestedInvestigation: 'Investigate.',
    limitation: 'Limited.',
    ...overrides,
  }
}

function product(overrides: Partial<ProductPerformance> = {}): ProductPerformance {
  return { sku: 'A', productName: 'Widget', hasSalesData: true, hasInventoryData: true, signals: [], ...overrides }
}

describe('buildProductPerformanceTable', () => {
  it('includes one row per product with numeric metric values', () => {
    const table = buildProductPerformanceTable([product({ revenueCurrent: 100, avgOrderValue: 20 })])
    expect(table.rows).toHaveLength(1)
    const skuIndex = table.headers.indexOf('sku')
    const revenueIndex = table.headers.indexOf('revenue_current')
    expect(table.rows[0][skuIndex]).toBe('A')
    expect(table.rows[0][revenueIndex]).toBe(100)
  })

  it('represents infinite days of inventory as readable text, not the literal value', () => {
    const table = buildProductPerformanceTable([product({ daysOfInventory: Infinity })])
    const index = table.headers.indexOf('days_of_inventory')
    expect(table.rows[0][index]).toBe('no recent sales')
  })

  it('includes the primary signal title when present', () => {
    const table = buildProductPerformanceTable([product({ primarySignal: signal({ title: 'Out of stock' }) })])
    const index = table.headers.indexOf('primary_signal')
    expect(table.rows[0][index]).toBe('Out of stock')
  })
})

describe('buildProductAttentionTable', () => {
  it('only includes products with a primary signal', () => {
    const table = buildProductAttentionTable([
      product({ sku: 'A', primarySignal: signal() }),
      product({ sku: 'B' }),
    ])
    expect(table.rows).toHaveLength(1)
    expect(table.rows[0][0]).toBe('A')
  })

  it('flattens supporting values into a readable column', () => {
    const table = buildProductAttentionTable([product({ primarySignal: signal({ supportingValues: [{ label: 'Revenue', value: '$50' }] }) })])
    const index = table.headers.indexOf('supporting_values')
    expect(table.rows[0][index]).toContain('Revenue: $50')
  })
})
