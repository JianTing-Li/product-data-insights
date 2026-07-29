import type { AnalysisPeriod, DailySalesPoint, SalesRecord } from './types'

function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Builds a day-by-day revenue/orders/units series spanning the previous
 * window (if any) through the end of the current window, with every day
 * present (zero-filled) so the chart never has gaps. Used only for the
 * performance chart — not part of the KPI or signal calculations. */
export function computeDailySeries(records: SalesRecord[], period: AnalysisPeriod): DailySalesPoint[] {
  const start = period.previous ? period.previous.start : period.current.start
  const end = period.current.end

  const byDate = new Map<string, { revenue: number; unitsSold: number; orderIds: Set<string> }>()
  for (const record of records) {
    if (!record.orderDate) continue
    const t = record.orderDate.getTime()
    if (t < start.getTime() || t > end.getTime()) continue
    const key = toDateKey(record.orderDate)
    let entry = byDate.get(key)
    if (!entry) {
      entry = { revenue: 0, unitsSold: 0, orderIds: new Set() }
      byDate.set(key, entry)
    }
    entry.revenue += record.quantity * record.sellingPrice
    entry.unitsSold += record.quantity
    entry.orderIds.add(record.orderId)
  }

  const points: DailySalesPoint[] = []
  let cursor = start
  while (cursor.getTime() <= end.getTime()) {
    const key = toDateKey(cursor)
    const entry = byDate.get(key)
    points.push({ date: key, revenue: entry?.revenue ?? 0, orders: entry?.orderIds.size ?? 0, units: entry?.unitsSold ?? 0 })
    cursor = addUtcDays(cursor, 1)
  }
  return points
}
