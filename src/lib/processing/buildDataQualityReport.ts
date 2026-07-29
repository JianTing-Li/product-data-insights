import type { ProductConflict } from './aggregateProducts'
import { findDuplicateSalesRows } from './findDuplicateSalesRows'
import type {
  DatasetKind,
  DataQualityReport,
  InventoryRecord,
  ProcessedRow,
  ProductPerformance,
  ProductRecord,
  SalesRecord,
} from './types'

export interface DataQualityInputs {
  salesRows: ProcessedRow<SalesRecord>[]
  productRows: ProcessedRow<ProductRecord>[]
  inventoryRows: ProcessedRow<InventoryRecord>[]
  conflicts: ProductConflict[]
  unmatchedProductIds: { sku: string; source: DatasetKind }[]
  datasetsPresent: DatasetKind[]
  joinedProducts: ProductPerformance[]
}

/** Consolidates every row-level and structural issue surfaced during
 * validation, deduplication, and joining into the single report shown in
 * the Data Quality tab. Nothing here removes rows from analysis — this is a
 * read-only summary of what was already flagged upstream. */
export function buildDataQualityReport(inputs: DataQualityInputs): DataQualityReport {
  const rejectedRows: DataQualityReport['rejectedRows'] = [
    ...inputs.salesRows.filter((r) => r.acceptance === 'rejected').map((row) => ({ datasetKind: 'sales' as const, row })),
    ...inputs.productRows.filter((r) => r.acceptance === 'rejected').map((row) => ({ datasetKind: 'products' as const, row })),
    ...inputs.inventoryRows.filter((r) => r.acceptance === 'rejected').map((row) => ({ datasetKind: 'inventory' as const, row })),
  ]

  const invalidDates = inputs.salesRows.filter((r) =>
    r.issues.some((i) => i.field === 'orderDate' && !i.message.includes('ambiguous')),
  )
  const invalidQuantities = inputs.salesRows.filter((r) => r.issues.some((i) => i.field === 'quantity'))
  const unparseablePrices = [
    ...inputs.salesRows.filter((r) => r.issues.some((i) => i.field === 'sellingPrice' || i.field === 'productCost')),
    ...inputs.productRows.filter((r) =>
      r.issues.some((i) => i.field === 'currentPrice' || i.field === 'originalPrice' || i.field === 'productCost'),
    ),
  ]

  const parsedSalesRows = inputs.salesRows.filter((r) => r.value !== null)
  const duplicateSalesRows = findDuplicateSalesRows(parsedSalesRows)

  const missingInventory = inputs.datasetsPresent.includes('inventory')
    ? inputs.joinedProducts.filter((p) => !p.hasInventoryData).map((p) => ({ sku: p.sku }))
    : []

  return {
    unmatchedProductIds: inputs.unmatchedProductIds,
    invalidDates,
    invalidQuantities,
    unparseablePrices,
    duplicateSalesRows,
    conflictingProductRecords: inputs.conflicts,
    missingInventory,
    rejectedRows,
  }
}
