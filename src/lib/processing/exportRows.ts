import type { CsvCell } from '@/lib/csv/exportCsv'
import type { ProductPerformance } from './types'

export interface CsvTable {
  headers: string[]
  rows: CsvCell[][]
}

const PERFORMANCE_HEADERS = [
  'sku',
  'product_name',
  'category',
  'brand',
  'current_price',
  'rating',
  'rating_count',
  'revenue_current',
  'revenue_previous',
  'units_current',
  'units_previous',
  'orders_current',
  'orders_previous',
  'avg_order_value',
  'gross_profit',
  'gross_margin',
  'sales_change_pct',
  'avg_daily_units',
  'available_inventory',
  'days_of_inventory',
  'primary_signal',
]

function inventoryDaysCell(days: number | undefined): CsvCell {
  if (days === undefined) return undefined
  return Number.isFinite(days) ? days : 'no recent sales'
}

/** Builds the "clean product-performance CSV" export: one row per analyzed
 * product with its computed metrics as plain numbers (not currency-
 * formatted strings), suitable for further analysis in a spreadsheet. */
export function buildProductPerformanceTable(products: ProductPerformance[]): CsvTable {
  const rows = products.map((p) => [
    p.sku,
    p.productName,
    p.category,
    p.brand,
    p.currentPrice,
    p.rating,
    p.ratingCount,
    p.revenueCurrent,
    p.revenuePrevious,
    p.unitsCurrent,
    p.unitsPrevious,
    p.ordersCurrent,
    p.ordersPrevious,
    p.avgOrderValue,
    p.grossProfit,
    p.grossMargin,
    p.salesChangePct,
    p.avgDailyUnits,
    p.availableInventory,
    inventoryDaysCell(p.daysOfInventory),
    p.primarySignal?.title,
  ])
  return { headers: PERFORMANCE_HEADERS, rows }
}

const ATTENTION_HEADERS = ['sku', 'product_name', 'primary_signal', 'severity', 'detected', 'supporting_values', 'suggested_investigation']

/** Builds the "product-attention CSV" export: every product with a primary
 * signal (not just the top 5 shown on Overview), with the signal's
 * evidence flattened into exportable columns. */
export function buildProductAttentionTable(products: ProductPerformance[]): CsvTable {
  const flagged = products.filter((p) => p.primarySignal)
  const rows = flagged.map((p) => {
    const signal = p.primarySignal!
    return [
      p.sku,
      p.productName,
      signal.title,
      signal.severity,
      signal.detected,
      signal.supportingValues.map((sv) => `${sv.label}: ${sv.value}`).join('; '),
      signal.suggestedInvestigation,
    ]
  })
  return { headers: ATTENTION_HEADERS, rows }
}
