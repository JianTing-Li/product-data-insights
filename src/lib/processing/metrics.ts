import type { OverallSalesAggregate, ProductSalesAggregate } from './aggregateSales'
import type { AnalysisPeriod, KpiSummary, KpiValue, ProductPerformance } from './types'

function kpiValue(current: number, previous: number | undefined): KpiValue {
  const changePct = previous !== undefined && previous > 0 ? (current - previous) / previous : undefined
  return { current, previous, changePct }
}

/** Computes dataset-level KPI cards from the overall (not per-product) sales
 * aggregate, so multi-item orders are never double-counted in the order
 * count or average order value. Returns an empty summary when there is no
 * sales data at all (catalog-only mode), so the UI can adapt its cards. */
export function computeKpis(overallSales: OverallSalesAggregate | null): KpiSummary {
  if (!overallSales) return {}

  const ordersCurrent = overallSales.current.distinctOrderIds.size
  const ordersPrevious = overallSales.previous?.distinctOrderIds.size
  const revenue = kpiValue(overallSales.current.revenue, overallSales.previous?.revenue)
  const units = kpiValue(overallSales.current.unitsSold, overallSales.previous?.unitsSold)
  const orders = kpiValue(ordersCurrent, ordersPrevious)

  const aovCurrent = ordersCurrent > 0 ? overallSales.current.revenue / ordersCurrent : undefined
  const aovPrevious =
    overallSales.previous && ordersPrevious !== undefined && ordersPrevious > 0
      ? overallSales.previous.revenue / ordersPrevious
      : undefined
  const avgOrderValue = aovCurrent !== undefined ? kpiValue(aovCurrent, aovPrevious) : undefined

  return { revenue, orders, units, avgOrderValue }
}

export interface ProductMetrics {
  avgOrderValue?: number
  grossProfit?: number
  grossMargin?: number
  salesChangePct?: number
  avgDailyUnits?: number
  daysOfInventory?: number
}

/** Computes the per-product derived metrics that require division (and so
 * need explicit zero/undefined handling): average order value, gross
 * profit/margin (only when cost is known for every contributing unit),
 * sales change vs. the previous period (only when a previous period exists
 * and had nonzero revenue — never fabricated from a zero base), average
 * daily units, and days of inventory. */
export function computeProductMetrics(
  product: ProductPerformance,
  salesAgg: ProductSalesAggregate | undefined,
  period: AnalysisPeriod | null,
): ProductMetrics {
  const avgOrderValue =
    product.ordersCurrent && product.ordersCurrent > 0 && product.revenueCurrent !== undefined
      ? product.revenueCurrent / product.ordersCurrent
      : undefined

  let grossProfit: number | undefined
  let grossMargin: number | undefined
  if (salesAgg?.current.costKnownForAllUnits && product.revenueCurrent !== undefined && product.revenueCurrent > 0) {
    grossProfit = product.revenueCurrent - salesAgg.current.costSum
    grossMargin = grossProfit / product.revenueCurrent
  }

  let salesChangePct: number | undefined
  if (
    period?.previous &&
    product.revenuePrevious !== undefined &&
    product.revenuePrevious > 0 &&
    product.revenueCurrent !== undefined
  ) {
    salesChangePct = (product.revenueCurrent - product.revenuePrevious) / product.revenuePrevious
  }

  let avgDailyUnits: number | undefined
  if (product.hasSalesData && period) {
    avgDailyUnits = (product.unitsCurrent ?? 0) / period.lengthDays
  }

  let daysOfInventory: number | undefined
  if (product.hasInventoryData && avgDailyUnits !== undefined && product.availableInventory !== undefined) {
    if (product.availableInventory === 0) {
      daysOfInventory = 0
    } else if (avgDailyUnits === 0) {
      daysOfInventory = Infinity
    } else {
      daysOfInventory = product.availableInventory / avgDailyUnits
    }
  }

  return { avgOrderValue, grossProfit, grossMargin, salesChangePct, avgDailyUnits, daysOfInventory }
}

/** Computes each declining product's share of the *overall* revenue
 * decline. Only meaningful when the dataset's total revenue actually
 * declined period-over-period; if it grew (or there's no comparison
 * period), no contribution values are produced. */
export function computeRevenueDeclineContribution(
  products: ProductPerformance[],
  kpis: KpiSummary,
): Map<string, number> {
  const result = new Map<string, number>()
  const current = kpis.revenue?.current
  const previous = kpis.revenue?.previous
  if (current === undefined || previous === undefined) return result

  const overallDecline = previous - current
  if (overallDecline <= 0) return result

  for (const product of products) {
    if (
      product.revenueCurrent !== undefined &&
      product.revenuePrevious !== undefined &&
      product.revenuePrevious > product.revenueCurrent
    ) {
      const productDecline = product.revenuePrevious - product.revenueCurrent
      result.set(product.sku, productDecline / overallDecline)
    }
  }

  return result
}
