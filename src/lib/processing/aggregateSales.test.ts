import { describe, expect, it } from 'vitest'
import { aggregateSalesByProductAndPeriod, aggregateSalesOverallByPeriod } from './aggregateSales'
import { computeAnalysisPeriod } from './computeAnalysisPeriod'
import type { SalesRecord } from './types'

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

function sale(overrides: Partial<SalesRecord> & { orderId: string; sku: string; orderDate: Date }): SalesRecord {
  return { quantity: 1, sellingPrice: 10, ...overrides }
}

const period = computeAnalysisPeriod([utcDate('2026-07-15'), utcDate('2026-07-28')], 7)!

describe('aggregateSalesByProductAndPeriod', () => {
  it('sums revenue and units per product within the current period', () => {
    const records = [
      sale({ orderId: 'O1', sku: 'A', orderDate: utcDate('2026-07-28'), quantity: 2, sellingPrice: 10 }),
      sale({ orderId: 'O2', sku: 'A', orderDate: utcDate('2026-07-27'), quantity: 1, sellingPrice: 10 }),
    ]
    const result = aggregateSalesByProductAndPeriod(records, period)
    expect(result.get('A')?.current.revenue).toBe(30)
    expect(result.get('A')?.current.unitsSold).toBe(3)
  })

  it('buckets rows into current vs previous periods correctly', () => {
    const records = [
      sale({ orderId: 'O1', sku: 'A', orderDate: utcDate('2026-07-28'), quantity: 1, sellingPrice: 10 }), // current
      sale({ orderId: 'O2', sku: 'A', orderDate: utcDate('2026-07-16'), quantity: 1, sellingPrice: 10 }), // previous
    ]
    const result = aggregateSalesByProductAndPeriod(records, period)
    expect(result.get('A')?.current.unitsSold).toBe(1)
    expect(result.get('A')?.previous?.unitsSold).toBe(1)
  })

  it('excludes rows outside both windows', () => {
    const records = [sale({ orderId: 'O1', sku: 'A', orderDate: utcDate('2026-01-01'), quantity: 5, sellingPrice: 10 })]
    const result = aggregateSalesByProductAndPeriod(records, period)
    expect(result.has('A')).toBe(false)
  })

  it('counts distinct order IDs, not sales rows, for order count', () => {
    const records = [
      sale({ orderId: 'O1', sku: 'A', orderDate: utcDate('2026-07-28') }),
      sale({ orderId: 'O1', sku: 'B', orderDate: utcDate('2026-07-28') }), // same order, different product
    ]
    const result = aggregateSalesByProductAndPeriod(records, period)
    expect(result.get('A')?.current.distinctOrderIds.size).toBe(1)
    expect(result.get('B')?.current.distinctOrderIds.size).toBe(1)
  })

  it('flags cost as not fully known when any contributing row lacks product cost', () => {
    const records = [
      sale({ orderId: 'O1', sku: 'A', orderDate: utcDate('2026-07-28'), productCost: 5 }),
      sale({ orderId: 'O2', sku: 'A', orderDate: utcDate('2026-07-27') }), // no cost
    ]
    const result = aggregateSalesByProductAndPeriod(records, period)
    expect(result.get('A')?.current.costKnownForAllUnits).toBe(false)
  })

  it('keeps cost known-for-all when every contributing row has product cost', () => {
    const records = [
      sale({ orderId: 'O1', sku: 'A', orderDate: utcDate('2026-07-28'), quantity: 2, productCost: 5 }),
    ]
    const result = aggregateSalesByProductAndPeriod(records, period)
    expect(result.get('A')?.current.costKnownForAllUnits).toBe(true)
    expect(result.get('A')?.current.costSum).toBe(10)
  })

  it('returns an empty map when there is no period (no valid dates)', () => {
    const records = [sale({ orderId: 'O1', sku: 'A', orderDate: utcDate('2026-07-28') })]
    expect(aggregateSalesByProductAndPeriod(records, null).size).toBe(0)
  })
})

describe('aggregateSalesOverallByPeriod', () => {
  it('does not double-count an order spanning multiple products', () => {
    const records = [
      sale({ orderId: 'O1', sku: 'A', orderDate: utcDate('2026-07-28') }),
      sale({ orderId: 'O1', sku: 'B', orderDate: utcDate('2026-07-28') }),
      sale({ orderId: 'O2', sku: 'A', orderDate: utcDate('2026-07-28') }),
    ]
    const result = aggregateSalesOverallByPeriod(records, period)
    expect(result?.current.distinctOrderIds.size).toBe(2)
  })

  it('sums revenue across all products in the current period', () => {
    const records = [
      sale({ orderId: 'O1', sku: 'A', orderDate: utcDate('2026-07-28'), sellingPrice: 10 }),
      sale({ orderId: 'O2', sku: 'B', orderDate: utcDate('2026-07-27'), sellingPrice: 20 }),
    ]
    const result = aggregateSalesOverallByPeriod(records, period)
    expect(result?.current.revenue).toBe(30)
  })
})
