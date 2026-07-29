import { describe, expect, it } from 'vitest'
import { joinDatasets } from './joinDatasets'
import type { AggregatedInventory } from './aggregateInventory'
import type { ProductSalesAggregate } from './aggregateSales'
import type { ProductRecord } from './types'

function product(sku: string, name: string): ProductRecord {
  return { sku, productName: name }
}

function salesAgg(revenue: number, units: number, orderCount: number): ProductSalesAggregate {
  const orderIds = new Set(Array.from({ length: orderCount }, (_, i) => `O${i}`))
  return { current: { revenue, unitsSold: units, distinctOrderIds: orderIds, costSum: 0, costKnownForAllUnits: true }, previous: null }
}

function invAgg(available: number, warehouses: string[] = ['WH-1']): AggregatedInventory {
  return { sku: 'placeholder', availableInventory: available, warehouses }
}

describe('joinDatasets', () => {
  it('joins a product present in all three sources', () => {
    const result = joinDatasets({
      products: [product('A', 'Widget')],
      salesAggregates: new Map([['A', salesAgg(100, 10, 5)]]),
      inventoryAggregates: new Map([['A', invAgg(50)]]),
    })
    const joined = result.products.find((p) => p.sku === 'A')
    expect(joined?.productName).toBe('Widget')
    expect(joined?.revenueCurrent).toBe(100)
    expect(joined?.unitsCurrent).toBe(10)
    expect(joined?.ordersCurrent).toBe(5)
    expect(joined?.availableInventory).toBe(50)
    expect(joined?.hasSalesData).toBe(true)
    expect(joined?.hasInventoryData).toBe(true)
  })

  it('does not duplicate rows when joining aggregated (not raw) sources', () => {
    // Both sources are already 1-row-per-SKU (aggregated) — joining must produce exactly one output row.
    const result = joinDatasets({
      products: [product('A', 'Widget')],
      salesAggregates: new Map([['A', salesAgg(100, 10, 5)]]),
      inventoryAggregates: new Map([['A', invAgg(50)]]),
    })
    expect(result.products.filter((p) => p.sku === 'A')).toHaveLength(1)
  })

  it('includes a product with no sales data, flagged accordingly', () => {
    const result = joinDatasets({
      products: [product('A', 'Widget')],
      salesAggregates: new Map(),
      inventoryAggregates: new Map(),
    })
    const joined = result.products[0]
    expect(joined.hasSalesData).toBe(false)
    expect(joined.revenueCurrent).toBeUndefined()
  })

  it('includes a sales-only SKU with a placeholder name and flags it unmatched', () => {
    const result = joinDatasets({
      products: [],
      salesAggregates: new Map([['A', salesAgg(100, 10, 5)]]),
      inventoryAggregates: new Map(),
    })
    expect(result.products[0].sku).toBe('A')
    expect(result.products[0].productName).toContain('A')
    expect(result.unmatchedProductIds).toContainEqual({ sku: 'A', source: 'sales' })
  })

  it('includes an inventory-only SKU and flags it unmatched', () => {
    const result = joinDatasets({
      products: [],
      salesAggregates: new Map(),
      inventoryAggregates: new Map([['A', invAgg(20)]]),
    })
    expect(result.unmatchedProductIds).toContainEqual({ sku: 'A', source: 'inventory' })
  })

  it('does not flag a product-catalog-only SKU as unmatched', () => {
    const result = joinDatasets({
      products: [product('A', 'Widget')],
      salesAggregates: new Map(),
      inventoryAggregates: new Map(),
    })
    expect(result.unmatchedProductIds).toHaveLength(0)
  })
})
