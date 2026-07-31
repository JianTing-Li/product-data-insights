import { describe, expect, it } from 'vitest'
import { findDuplicateSalesRows } from './findDuplicateSalesRows'
import type { ProcessedRow, SalesRecord } from './types'

function row(overrides: Partial<SalesRecord>, rowIndex: number): ProcessedRow<SalesRecord> {
  const value: SalesRecord = { orderId: 'O1', orderDate: new Date('2026-07-15'), sku: 'A', quantity: 1, sellingPrice: 10, ...overrides }
  return { rowIndex, fileId: 'f1', acceptance: 'accepted', issues: [], raw: {}, value }
}

describe('findDuplicateSalesRows', () => {
  it('flags an exact repeat of order+sku+quantity+price+date as a duplicate', () => {
    const rows = [row({}, 0), row({}, 1)]
    const duplicates = findDuplicateSalesRows(rows)
    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].rowIndex).toBe(1)
  })

  it('does not flag the first occurrence', () => {
    const rows = [row({}, 0), row({}, 1)]
    const duplicates = findDuplicateSalesRows(rows)
    expect(duplicates.some((d) => d.rowIndex === 0)).toBe(false)
  })

  it('does not flag rows that differ in quantity', () => {
    const rows = [row({ quantity: 1 }, 0), row({ quantity: 2 }, 1)]
    expect(findDuplicateSalesRows(rows)).toHaveLength(0)
  })

  it('does not flag two different orders for the same product on the same day', () => {
    const rows = [row({ orderId: 'O1' }, 0), row({ orderId: 'O2' }, 1)]
    expect(findDuplicateSalesRows(rows)).toHaveLength(0)
  })

  it('skips rejected rows (no parsed value)', () => {
    const rejected: ProcessedRow<SalesRecord> = { rowIndex: 0, fileId: 'f1', acceptance: 'rejected', issues: [], raw: {}, value: null }
    expect(findDuplicateSalesRows([rejected, rejected])).toHaveLength(0)
  })
})
