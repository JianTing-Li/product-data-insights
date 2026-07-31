import { aggregateInventoryBySku } from './aggregateInventory'
import { deduplicateProducts } from './aggregateProducts'
import { aggregateSalesByProductAndPeriod, aggregateSalesOverallByPeriod, type OverallSalesAggregate, type ProductSalesAggregate } from './aggregateSales'
import { buildDataQualityReport } from './buildDataQualityReport'
import { computeAnalysisPeriod } from './computeAnalysisPeriod'
import { computeDailySeries } from './dailySeries'
import { detectCurrencyFromRecords } from './detectCurrency'
import { joinDatasets } from './joinDatasets'
import { validateInventoryRows, validateProductRows, validateSalesRows } from './validateRows'
import type {
  AddedFile,
  AnalysisMode,
  AnalysisPeriod,
  DailySalesPoint,
  DataQualityReport,
  DatasetKind,
  FileMapping,
  PeriodSelection,
  ProductPerformance,
} from './types'

export interface PipelineOutput {
  mode: AnalysisMode
  datasetsPresent: DatasetKind[]
  period: AnalysisPeriod | null
  /** Joined per-product records with raw aggregate numbers attached, but
   * without derived metrics (AOV, margin, days of inventory, ...) or
   * signals — those are computed downstream from this output. */
  products: ProductPerformance[]
  salesAggregates: Map<string, ProductSalesAggregate>
  overallSales: OverallSalesAggregate | null
  dataQuality: DataQualityReport
  dailySeries: DailySalesPoint[]
  currency: string
}

/** Runs the full parse-through-join pipeline: normalize/parse/validate each
 * mapped file, aggregate each dataset independently, then join only after
 * aggregation so one-to-many source rows (order lines, warehouse rows)
 * never fan out into duplicated results. Metrics and signal generation are
 * a separate downstream stage that consumes this output. */
export function runPipeline(
  files: AddedFile[],
  mappings: Record<string, FileMapping>,
  periodLength: PeriodSelection,
): PipelineOutput {
  const parsedFiles = files.filter((f) => f.status === 'parsed')
  const salesFiles = parsedFiles.filter((f) => mappings[f.id]?.datasetKind === 'sales')
  const productFiles = parsedFiles.filter((f) => mappings[f.id]?.datasetKind === 'products')
  const inventoryFiles = parsedFiles.filter((f) => mappings[f.id]?.datasetKind === 'inventory')

  const salesRows = salesFiles.flatMap((f) => validateSalesRows(f.rows, mappings[f.id].mappings, f.id))
  const productRows = productFiles.flatMap((f) => validateProductRows(f.rows, mappings[f.id].mappings, f.id))
  const inventoryRows = inventoryFiles.flatMap((f) => validateInventoryRows(f.rows, mappings[f.id].mappings, f.id))

  const acceptedProducts = productRows.flatMap((r) => (r.value ? [r.value] : []))
  const { products: dedupedProducts, conflicts } = deduplicateProducts(acceptedProducts)

  const acceptedInventory = inventoryRows.flatMap((r) => (r.value ? [r.value] : []))
  const inventoryAggregates = aggregateInventoryBySku(acceptedInventory)

  const acceptedSales = salesRows.flatMap((r) => (r.value ? [r.value] : []))
  const validDates = acceptedSales.flatMap((r) => (r.orderDate ? [r.orderDate] : []))
  const period = computeAnalysisPeriod(validDates, periodLength)

  const salesAggregates = aggregateSalesByProductAndPeriod(acceptedSales, period)
  const overallSales = aggregateSalesOverallByPeriod(acceptedSales, period)

  const { products: joinedProducts, unmatchedProductIds } = joinDatasets({
    products: dedupedProducts,
    salesAggregates,
    inventoryAggregates,
  })

  const datasetsPresent: DatasetKind[] = []
  if (salesFiles.length > 0) datasetsPresent.push('sales')
  if (productFiles.length > 0) datasetsPresent.push('products')
  if (inventoryFiles.length > 0) datasetsPresent.push('inventory')

  const dataQuality = buildDataQualityReport({
    salesRows,
    productRows,
    inventoryRows,
    conflicts,
    unmatchedProductIds,
    datasetsPresent,
    joinedProducts,
  })

  const mode: AnalysisMode = datasetsPresent.includes('sales') ? 'full' : 'catalog-only'
  const dailySeries = period ? computeDailySeries(acceptedSales, period) : []
  // Prefer sales currency (a dataset-level aggregate concept); fall back to
  // the product catalog's own currency column when there's no sales data at
  // all (catalog-only mode).
  const currency = detectCurrencyFromRecords(acceptedSales) ?? detectCurrencyFromRecords(dedupedProducts) ?? 'USD'

  return { mode, datasetsPresent, period, products: joinedProducts, salesAggregates, overallSales, dataQuality, dailySeries, currency }
}
