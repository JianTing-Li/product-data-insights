import { describe, expect, it } from 'vitest'
import { aggregateInventoryBySku } from './aggregateInventory'
import type { InventoryRecord } from './types'

function record(overrides: Partial<InventoryRecord> & { sku: string; availableInventory: number }): InventoryRecord {
  return overrides
}

describe('aggregateInventoryBySku', () => {
  it('sums available inventory across multiple warehouse rows for the same product', () => {
    const result = aggregateInventoryBySku([
      record({ sku: 'A', warehouse: 'WH-EAST', availableInventory: 60 }),
      record({ sku: 'A', warehouse: 'WH-WEST', availableInventory: 40 }),
    ])
    expect(result.get('A')?.availableInventory).toBe(100)
  })

  it('collects distinct warehouse names', () => {
    const result = aggregateInventoryBySku([
      record({ sku: 'A', warehouse: 'WH-EAST', availableInventory: 60 }),
      record({ sku: 'A', warehouse: 'WH-WEST', availableInventory: 40 }),
    ])
    expect(result.get('A')?.warehouses).toEqual(['WH-EAST', 'WH-WEST'])
  })

  it('sums reserved and incoming inventory when present', () => {
    const result = aggregateInventoryBySku([
      record({ sku: 'A', availableInventory: 60, reservedInventory: 5, incomingInventory: 10 }),
      record({ sku: 'A', availableInventory: 40, reservedInventory: 3, incomingInventory: 0 }),
    ])
    expect(result.get('A')?.reservedInventory).toBe(8)
    expect(result.get('A')?.incomingInventory).toBe(10)
  })

  it('keeps separate totals for different products', () => {
    const result = aggregateInventoryBySku([
      record({ sku: 'A', availableInventory: 60 }),
      record({ sku: 'B', availableInventory: 20 }),
    ])
    expect(result.get('A')?.availableInventory).toBe(60)
    expect(result.get('B')?.availableInventory).toBe(20)
  })

  it('does not duplicate a warehouse name seen twice for the same product', () => {
    const result = aggregateInventoryBySku([
      record({ sku: 'A', warehouse: 'WH-EAST', availableInventory: 10 }),
      record({ sku: 'A', warehouse: 'WH-EAST', availableInventory: 5 }),
    ])
    expect(result.get('A')?.warehouses).toEqual(['WH-EAST'])
    expect(result.get('A')?.availableInventory).toBe(15)
  })
})
