import { describe, expect, it } from 'vitest'
import { computeDailySeries } from './dailySeries'
import { computeAnalysisPeriod } from './computeAnalysisPeriod'
import type { SalesRecord } from './types'

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

function sale(overrides: Partial<SalesRecord> & { orderId: string; orderDate: Date }): SalesRecord {
  return { sku: 'A', quantity: 1, sellingPrice: 10, ...overrides }
}

describe('computeDailySeries', () => {
  it('produces one point per day spanning previous + current windows', () => {
    const period = computeAnalysisPeriod([utcDate('2026-07-15'), utcDate('2026-07-28')], 7)!
    const series = computeDailySeries([], period)
    expect(series).toHaveLength(14)
    expect(series[0].date).toBe('2026-07-15')
    expect(series[13].date).toBe('2026-07-28')
  })

  it('zero-fills days with no sales', () => {
    const period = computeAnalysisPeriod([utcDate('2026-07-15'), utcDate('2026-07-28')], 7)!
    const series = computeDailySeries([], period)
    expect(series.every((p) => p.revenue === 0 && p.units === 0 && p.orders === 0)).toBe(true)
  })

  it('aggregates revenue/units/orders per day', () => {
    const period = computeAnalysisPeriod([utcDate('2026-07-15'), utcDate('2026-07-28')], 7)!
    const records = [
      sale({ orderId: 'O1', orderDate: utcDate('2026-07-28'), quantity: 2, sellingPrice: 10 }),
      sale({ orderId: 'O1', orderDate: utcDate('2026-07-28'), sku: 'B', quantity: 1, sellingPrice: 5 }),
      sale({ orderId: 'O2', orderDate: utcDate('2026-07-28'), quantity: 1, sellingPrice: 10 }),
    ]
    const series = computeDailySeries(records, period)
    const lastDay = series[series.length - 1]
    expect(lastDay.revenue).toBe(35)
    expect(lastDay.units).toBe(4)
    expect(lastDay.orders).toBe(2) // distinct order IDs
  })

  it('excludes sales outside the covered window', () => {
    const period = computeAnalysisPeriod([utcDate('2026-07-15'), utcDate('2026-07-28')], 7)!
    const records = [sale({ orderId: 'O1', orderDate: utcDate('2026-01-01'), quantity: 5 })]
    const series = computeDailySeries(records, period)
    expect(series.reduce((sum, p) => sum + p.units, 0)).toBe(0)
  })

  it('spans only the current window when there is no previous period', () => {
    const period = computeAnalysisPeriod([utcDate('2026-07-25'), utcDate('2026-07-28')], 7)!
    expect(period.previous).toBeNull()
    const series = computeDailySeries([], period)
    expect(series).toHaveLength(7)
  })
})
