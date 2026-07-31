import { describe, expect, it } from 'vitest'
import {
  buildConflictingProductRecordsTable,
  buildDataQualitySummaryTable,
  buildMissingInventoryTable,
  buildRejectedRowsTable,
  buildUnmatchedProductIdsTable,
} from './dataQualityExports'
import type { DataQualityReport, ProcessedRow } from './types'

function emptyReport(): DataQualityReport {
  return {
    unmatchedProductIds: [],
    invalidDates: [],
    invalidQuantities: [],
    unparseablePrices: [],
    duplicateSalesRows: [],
    conflictingProductRecords: [],
    missingInventory: [],
    rejectedRows: [],
  }
}

describe('buildUnmatchedProductIdsTable', () => {
  it('exports sku and source', () => {
    const table = buildUnmatchedProductIdsTable([{ sku: 'A', source: 'sales' }])
    expect(table.rows).toEqual([['A', 'sales']])
  })
})

describe('buildMissingInventoryTable', () => {
  it('exports one row per sku', () => {
    expect(buildMissingInventoryTable([{ sku: 'A' }, { sku: 'B' }]).rows).toEqual([['A'], ['B']])
  })
})

describe('buildConflictingProductRecordsTable', () => {
  it('exports one row per conflicting record with the differing fields noted', () => {
    const table = buildConflictingProductRecordsTable([
      {
        sku: 'A',
        fields: ['currentPrice'],
        records: [
          { sku: 'A', productName: 'Widget', currentPrice: 9.99 },
          { sku: 'A', productName: 'Widget', currentPrice: 12.99 },
        ],
      },
    ])
    expect(table.rows).toHaveLength(2)
    expect(table.rows[0][0]).toBe('A')
    expect(table.rows[0][1]).toBe('currentPrice')
  })
})

describe('buildRejectedRowsTable', () => {
  it('includes the dataset kind, row number, reasons, and raw source columns', () => {
    const row: ProcessedRow<unknown> = {
      rowIndex: 3,
      fileId: 'f1',
      acceptance: 'rejected',
      issues: [{ field: 'quantity', message: 'Quantity must be greater than zero.' }],
      raw: { sku: 'A', quantity: '0' },
      value: null,
    }
    const table = buildRejectedRowsTable([{ datasetKind: 'sales', row }])
    expect(table.headers).toContain('dataset')
    expect(table.headers).toContain('sku')
    expect(table.rows[0][table.headers.indexOf('dataset')]).toBe('sales')
    expect(table.rows[0][table.headers.indexOf('row_number')]).toBe(4)
    expect(table.rows[0][table.headers.indexOf('issues')]).toContain('Quantity must be greater than zero.')
  })
})

describe('buildDataQualitySummaryTable', () => {
  it('reports a count row per category', () => {
    const report = { ...emptyReport(), unmatchedProductIds: [{ sku: 'A', source: 'sales' as const }] }
    const table = buildDataQualitySummaryTable(report)
    expect(table.rows).toContainEqual(['Unmatched product IDs', 1])
    expect(table.rows).toContainEqual(['Rejected rows', 0])
  })
})
