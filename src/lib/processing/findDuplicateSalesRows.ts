import type { ProcessedRow, SalesRecord } from './types'

/** Flags sales rows that are exact duplicates of an earlier row (same order
 * ID, SKU, quantity, price, and date) — most likely a duplicate export, not
 * two genuine line items. Returns only the repeat occurrences (the first
 * occurrence is left as the canonical, non-flagged row); rows are never
 * excluded from aggregation based on this, only surfaced for inspection. */
export function findDuplicateSalesRows(rows: ProcessedRow<SalesRecord>[]): ProcessedRow<SalesRecord>[] {
  const seen = new Set<string>()
  const duplicates: ProcessedRow<SalesRecord>[] = []

  for (const row of rows) {
    if (!row.value) continue
    const key = [
      row.value.orderId,
      row.value.sku,
      row.value.quantity,
      row.value.sellingPrice,
      row.value.orderDate?.toISOString() ?? '',
    ].join('|')

    if (seen.has(key)) {
      duplicates.push(row)
    } else {
      seen.add(key)
    }
  }

  return duplicates
}
