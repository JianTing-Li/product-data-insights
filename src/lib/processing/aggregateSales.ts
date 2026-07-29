import type { AnalysisPeriod, SalesRecord } from './types'

export interface PeriodSalesAggregate {
  revenue: number
  unitsSold: number
  distinctOrderIds: Set<string>
  costSum: number
  costKnownForAllUnits: boolean
}

export interface ProductSalesAggregate {
  current: PeriodSalesAggregate
  previous: PeriodSalesAggregate | null
}

export interface OverallSalesAggregate {
  current: PeriodSalesAggregate
  previous: PeriodSalesAggregate | null
}

function emptyPeriodAggregate(): PeriodSalesAggregate {
  return { revenue: 0, unitsSold: 0, distinctOrderIds: new Set(), costSum: 0, costKnownForAllUnits: true }
}

function accumulate(agg: PeriodSalesAggregate, record: SalesRecord): void {
  agg.revenue += record.quantity * record.sellingPrice
  agg.unitsSold += record.quantity
  agg.distinctOrderIds.add(record.orderId)
  if (record.productCost !== undefined) {
    agg.costSum += record.quantity * record.productCost
  } else {
    agg.costKnownForAllUnits = false
  }
}

function bucketFor(date: Date | null, period: AnalysisPeriod): 'current' | 'previous' | null {
  if (!date) return null
  const t = date.getTime()
  if (t >= period.current.start.getTime() && t <= period.current.end.getTime()) return 'current'
  if (period.previous && t >= period.previous.start.getTime() && t <= period.previous.end.getTime()) return 'previous'
  return null
}

/** Aggregates sales revenue/units/distinct-orders per product, split into
 * the current and previous comparison periods. Only rows falling inside one
 * of those two windows are counted — sales rows must be aggregated by
 * product *and period* before anything downstream can compute period-over-
 * period metrics. */
export function aggregateSalesByProductAndPeriod(
  records: SalesRecord[],
  period: AnalysisPeriod | null,
): Map<string, ProductSalesAggregate> {
  const result = new Map<string, ProductSalesAggregate>()
  if (!period) return result

  for (const record of records) {
    const bucket = bucketFor(record.orderDate, period)
    if (!bucket) continue

    let entry = result.get(record.sku)
    if (!entry) {
      entry = { current: emptyPeriodAggregate(), previous: period.previous ? emptyPeriodAggregate() : null }
      result.set(record.sku, entry)
    }
    const agg = bucket === 'current' ? entry.current : entry.previous
    if (agg) accumulate(agg, record)
  }

  return result
}

/** Same aggregation as above but across the whole dataset rather than per
 * product — used for dataset-level KPIs (total revenue, total distinct
 * orders, etc.), which must not be computed by summing per-product distinct
 * order counts (that would double-count orders containing multiple
 * products). */
export function aggregateSalesOverallByPeriod(
  records: SalesRecord[],
  period: AnalysisPeriod | null,
): OverallSalesAggregate | null {
  if (!period) return null

  const current = emptyPeriodAggregate()
  const previous = period.previous ? emptyPeriodAggregate() : null

  for (const record of records) {
    const bucket = bucketFor(record.orderDate, period)
    if (bucket === 'current') accumulate(current, record)
    else if (bucket === 'previous' && previous) accumulate(previous, record)
  }

  return { current, previous }
}
