import { describe, expect, it } from 'vitest'
import { computeKpis, computeProductMetrics, computeRevenueDeclineContribution } from './metrics'
import type { OverallSalesAggregate, ProductSalesAggregate } from './aggregateSales'
import type { AnalysisPeriod, KpiSummary, ProductPerformance } from './types'

function overall(current: Partial<OverallSalesAggregate['current']>, previous?: Partial<OverallSalesAggregate['current']> | null): OverallSalesAggregate {
  const base = { revenue: 0, unitsSold: 0, distinctOrderIds: new Set<string>(), costSum: 0, costKnownForAllUnits: true }
  return {
    current: { ...base, ...current },
    previous: previous === null ? null : previous === undefined ? null : { ...base, ...previous },
  }
}

describe('computeKpis', () => {
  it('returns an empty summary when there is no sales data', () => {
    expect(computeKpis(null)).toEqual({})
  })

  it('computes revenue, units, and orders from distinct order IDs', () => {
    const agg = overall({ revenue: 1000, unitsSold: 50, distinctOrderIds: new Set(['O1', 'O2']) })
    const kpis = computeKpis(agg)
    expect(kpis.revenue?.current).toBe(1000)
    expect(kpis.units?.current).toBe(50)
    expect(kpis.orders?.current).toBe(2)
  })

  it('computes average order value as revenue divided by distinct orders', () => {
    const agg = overall({ revenue: 100, unitsSold: 10, distinctOrderIds: new Set(['O1', 'O2']) })
    const kpis = computeKpis(agg)
    expect(kpis.avgOrderValue?.current).toBe(50)
  })

  it('does not compute average order value when there are zero orders', () => {
    const agg = overall({ revenue: 0, unitsSold: 0, distinctOrderIds: new Set() })
    const kpis = computeKpis(agg)
    expect(kpis.avgOrderValue).toBeUndefined()
  })

  it('computes changePct against the previous period', () => {
    const agg = overall({ revenue: 150, distinctOrderIds: new Set(['O1']) }, { revenue: 100, distinctOrderIds: new Set(['O1']) })
    const kpis = computeKpis(agg)
    expect(kpis.revenue?.changePct).toBeCloseTo(0.5)
  })

  it('does not compute changePct when the previous period had zero revenue (avoids divide by zero)', () => {
    const agg = overall({ revenue: 150, distinctOrderIds: new Set(['O1']) }, { revenue: 0, distinctOrderIds: new Set() })
    const kpis = computeKpis(agg)
    expect(kpis.revenue?.changePct).toBeUndefined()
  })

  it('does not compute changePct when there is no previous period at all', () => {
    const agg = overall({ revenue: 150, distinctOrderIds: new Set(['O1']) })
    const kpis = computeKpis(agg)
    expect(kpis.revenue?.changePct).toBeUndefined()
    expect(kpis.revenue?.previous).toBeUndefined()
  })
})

const period30: AnalysisPeriod = {
  lengthDays: 30,
  current: { start: new Date('2026-06-29'), end: new Date('2026-07-28') },
  previous: { start: new Date('2026-05-30'), end: new Date('2026-06-28') },
  hasSufficientHistory: true,
  datasetLatestDate: new Date('2026-07-28'),
}

function product(overrides: Partial<ProductPerformance> = {}): ProductPerformance {
  return { sku: 'A', productName: 'Widget', hasSalesData: true, hasInventoryData: true, signals: [], ...overrides }
}

function salesAgg(costSum: number, costKnownForAllUnits: boolean): ProductSalesAggregate {
  return {
    current: { revenue: 0, unitsSold: 0, distinctOrderIds: new Set(), costSum, costKnownForAllUnits },
    previous: null,
  }
}

describe('computeProductMetrics', () => {
  it('computes average order value', () => {
    const p = product({ revenueCurrent: 100, ordersCurrent: 4 })
    expect(computeProductMetrics(p, undefined, period30).avgOrderValue).toBe(25)
  })

  it('does not compute average order value with zero orders', () => {
    const p = product({ revenueCurrent: 0, ordersCurrent: 0 })
    expect(computeProductMetrics(p, undefined, period30).avgOrderValue).toBeUndefined()
  })

  it('computes gross profit and margin when cost is known for every unit', () => {
    const p = product({ revenueCurrent: 100 })
    const agg = salesAgg(60, true)
    const result = computeProductMetrics(p, agg, period30)
    expect(result.grossProfit).toBe(40)
    expect(result.grossMargin).toBeCloseTo(0.4)
  })

  it('does not compute gross margin when cost is only known for some units', () => {
    const p = product({ revenueCurrent: 100 })
    const agg = salesAgg(60, false)
    const result = computeProductMetrics(p, agg, period30)
    expect(result.grossMargin).toBeUndefined()
  })

  it('computes sales change vs. the previous period', () => {
    const p = product({ revenueCurrent: 150, revenuePrevious: 100 })
    expect(computeProductMetrics(p, undefined, period30).salesChangePct).toBeCloseTo(0.5)
  })

  it('does not fabricate a sales change when the previous period had zero revenue', () => {
    const p = product({ revenueCurrent: 150, revenuePrevious: 0 })
    expect(computeProductMetrics(p, undefined, period30).salesChangePct).toBeUndefined()
  })

  it('does not compute sales change when there is no previous period (insufficient history)', () => {
    const periodNoPrevious: AnalysisPeriod = { ...period30, previous: null, hasSufficientHistory: false }
    const p = product({ revenueCurrent: 150, revenuePrevious: 100 })
    expect(computeProductMetrics(p, undefined, periodNoPrevious).salesChangePct).toBeUndefined()
  })

  it('computes average daily units from the current period length', () => {
    const p = product({ unitsCurrent: 60 })
    expect(computeProductMetrics(p, undefined, period30).avgDailyUnits).toBe(2)
  })

  it('treats zero current-period units as a real zero, not undefined, when sales data exists', () => {
    const p = product({ unitsCurrent: 0, hasSalesData: true })
    expect(computeProductMetrics(p, undefined, period30).avgDailyUnits).toBe(0)
  })

  it('leaves average daily units undefined when there is no sales data at all', () => {
    const p = product({ hasSalesData: false })
    expect(computeProductMetrics(p, undefined, period30).avgDailyUnits).toBeUndefined()
  })

  it('computes days of inventory as available inventory divided by average daily units', () => {
    // avgDailyUnits = 30 units / 30-day period = 1/day, so 100 available lasts 100 days.
    const p = product({ availableInventory: 100, unitsCurrent: 30 })
    expect(computeProductMetrics(p, undefined, period30).daysOfInventory).toBeCloseTo(100)
  })

  it('reports zero days of inventory when available inventory is zero, regardless of sales pace', () => {
    const p = product({ availableInventory: 0, unitsCurrent: 10 })
    expect(computeProductMetrics(p, undefined, period30).daysOfInventory).toBe(0)
  })

  it('reports infinite days of inventory when there is stock but zero recent sales pace', () => {
    const p = product({ availableInventory: 50, unitsCurrent: 0 })
    expect(computeProductMetrics(p, undefined, period30).daysOfInventory).toBe(Infinity)
  })

  it('does not compute days of inventory without inventory data', () => {
    const p = product({ hasInventoryData: false, unitsCurrent: 10 })
    expect(computeProductMetrics(p, undefined, period30).daysOfInventory).toBeUndefined()
  })
})

describe('computeRevenueDeclineContribution', () => {
  it('attributes each declining product a share of the overall decline', () => {
    const products = [
      product({ sku: 'A', revenueCurrent: 50, revenuePrevious: 100 }), // declined 50
      product({ sku: 'B', revenueCurrent: 80, revenuePrevious: 100 }), // declined 20
    ]
    const kpis: KpiSummary = { revenue: { current: 130, previous: 200 } } // overall declined 70
    const result = computeRevenueDeclineContribution(products, kpis)
    expect(result.get('A')).toBeCloseTo(50 / 70)
    expect(result.get('B')).toBeCloseTo(20 / 70)
  })

  it('does not attribute contribution to a product that grew', () => {
    const products = [product({ sku: 'A', revenueCurrent: 120, revenuePrevious: 100 })]
    const kpis: KpiSummary = { revenue: { current: 130, previous: 200 } }
    expect(computeRevenueDeclineContribution(products, kpis).has('A')).toBe(false)
  })

  it('produces no contributions when overall revenue grew', () => {
    const products = [product({ sku: 'A', revenueCurrent: 50, revenuePrevious: 100 })]
    const kpis: KpiSummary = { revenue: { current: 250, previous: 200 } }
    expect(computeRevenueDeclineContribution(products, kpis).size).toBe(0)
  })

  it('produces no contributions when there is no previous-period revenue to compare', () => {
    const products = [product({ sku: 'A', revenueCurrent: 50 })]
    const kpis: KpiSummary = { revenue: { current: 50 } }
    expect(computeRevenueDeclineContribution(products, kpis).size).toBe(0)
  })
})
