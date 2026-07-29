import type { InventoryRecord } from './types'

export interface AggregatedInventory {
  sku: string
  availableInventory: number
  reservedInventory?: number
  incomingInventory?: number
  reorderLevel?: number
  warehouses: string[]
}

/** Aggregates inventory records across warehouses for the same product,
 * summing quantity fields and collecting the distinct warehouse names. A
 * product may legitimately have multiple rows (one per warehouse). */
export function aggregateInventoryBySku(records: InventoryRecord[]): Map<string, AggregatedInventory> {
  const bySku = new Map<string, AggregatedInventory>()

  for (const record of records) {
    const existing = bySku.get(record.sku)
    if (!existing) {
      bySku.set(record.sku, {
        sku: record.sku,
        availableInventory: record.availableInventory,
        reservedInventory: record.reservedInventory,
        incomingInventory: record.incomingInventory,
        reorderLevel: record.reorderLevel,
        warehouses: record.warehouse ? [record.warehouse] : [],
      })
      continue
    }

    existing.availableInventory += record.availableInventory
    if (record.reservedInventory !== undefined) {
      existing.reservedInventory = (existing.reservedInventory ?? 0) + record.reservedInventory
    }
    if (record.incomingInventory !== undefined) {
      existing.incomingInventory = (existing.incomingInventory ?? 0) + record.incomingInventory
    }
    if (record.reorderLevel !== undefined) {
      existing.reorderLevel = (existing.reorderLevel ?? 0) + record.reorderLevel
    }
    if (record.warehouse && !existing.warehouses.includes(record.warehouse)) {
      existing.warehouses.push(record.warehouse)
    }
  }

  return bySku
}
