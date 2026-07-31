import type { CsvCell } from '@/lib/csv/exportCsv'
import type { CsvTable } from './exportRows'
import type { DatasetKind, DataQualityReport, ProcessedRow } from './types'

/** Flattens a set of processed rows (each with its original raw CSV cells)
 * into a CSV table — the union of every raw column seen across the rows,
 * so the export stays useful even when rows came from different files. */
function buildProcessedRowsTable(rows: ProcessedRow<unknown>[]): CsvTable {
  const rawKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r.raw))))
  const headers = ['row_number', 'acceptance', 'issues', ...rawKeys]
  const csvRows: CsvCell[][] = rows.map((r) => [
    r.rowIndex + 1,
    r.acceptance,
    r.issues.map((i) => `${i.field}: ${i.message}`).join('; '),
    ...rawKeys.map((k) => r.raw[k] ?? ''),
  ])
  return { headers, rows: csvRows }
}

export function buildUnmatchedProductIdsTable(items: { sku: string; source: DatasetKind }[]): CsvTable {
  return { headers: ['sku', 'source'], rows: items.map((i) => [i.sku, i.source]) }
}

export function buildInvalidDatesTable(rows: ProcessedRow<unknown>[]): CsvTable {
  return buildProcessedRowsTable(rows)
}

export function buildInvalidQuantitiesTable(rows: ProcessedRow<unknown>[]): CsvTable {
  return buildProcessedRowsTable(rows)
}

export function buildUnparseablePricesTable(rows: ProcessedRow<unknown>[]): CsvTable {
  return buildProcessedRowsTable(rows)
}

export function buildDuplicateSalesRowsTable(rows: ProcessedRow<unknown>[]): CsvTable {
  return buildProcessedRowsTable(rows)
}

export function buildConflictingProductRecordsTable(conflicts: DataQualityReport['conflictingProductRecords']): CsvTable {
  const headers = [
    'sku',
    'differing_fields',
    'record_number',
    'product_name',
    'category',
    'brand',
    'current_price',
    'original_price',
    'product_cost',
    'rating',
    'rating_count',
  ]
  const rows: CsvCell[][] = []
  for (const conflict of conflicts) {
    conflict.records.forEach((record, index) => {
      rows.push([
        conflict.sku,
        conflict.fields.join('; '),
        index + 1,
        record.productName,
        record.category,
        record.brand,
        record.currentPrice,
        record.originalPrice,
        record.productCost,
        record.rating,
        record.ratingCount,
      ])
    })
  }
  return { headers, rows }
}

export function buildMissingInventoryTable(items: { sku: string }[]): CsvTable {
  return { headers: ['sku'], rows: items.map((i) => [i.sku]) }
}

export function buildRejectedRowsTable(rejected: DataQualityReport['rejectedRows']): CsvTable {
  const rawKeys = Array.from(new Set(rejected.flatMap(({ row }) => Object.keys(row.raw))))
  const headers = ['dataset', 'row_number', 'issues', ...rawKeys]
  const rows: CsvCell[][] = rejected.map(({ datasetKind, row }) => [
    datasetKind,
    row.rowIndex + 1,
    row.issues.map((i) => `${i.field}: ${i.message}`).join('; '),
    ...rawKeys.map((k) => row.raw[k] ?? ''),
  ])
  return { headers, rows }
}

/** Builds the combined "data-quality CSV" export: one summary row per
 * issue category with its count. */
export function buildDataQualitySummaryTable(report: DataQualityReport): CsvTable {
  const rows: CsvCell[][] = [
    ['Unmatched product IDs', report.unmatchedProductIds.length],
    ['Invalid dates', report.invalidDates.length],
    ['Invalid quantities', report.invalidQuantities.length],
    ['Unparseable prices', report.unparseablePrices.length],
    ['Duplicate sales rows', report.duplicateSalesRows.length],
    ['Conflicting product records', report.conflictingProductRecords.length],
    ['Missing inventory', report.missingInventory.length],
    ['Rejected rows', report.rejectedRows.length],
  ]
  return { headers: ['category', 'count'], rows }
}
