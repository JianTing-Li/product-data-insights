// Core domain types shared by the processing pipeline, the store, and the UI.
// Kept dependency-free so the pipeline stays pure and testable in isolation.

export type DatasetKind = 'sales' | 'products' | 'inventory'

export type RawRow = Record<string, string>

export interface CsvParseIssue {
  row: number
  message: string
}

/** A file the user added, before or after parsing. */
export interface AddedFile {
  id: string
  filename: string
  source: 'upload' | 'sample'
  sizeBytes: number
  status: 'parsing' | 'parsed' | 'error'
  error?: string
  datasetKind?: DatasetKind
  detectionConfidence?: 'high' | 'medium' | 'low'
  headers: string[]
  rowCount: number
  rows: RawRow[]
  parseIssues: CsvParseIssue[]
}

// ---- Column mapping ----------------------------------------------------

export type SalesField =
  | 'orderId'
  | 'orderDate'
  | 'sku'
  | 'quantity'
  | 'sellingPrice'
  | 'productCost'
  | 'orderStatus'
  | 'discount'
  | 'currency'

export type ProductField =
  | 'sku'
  | 'productName'
  | 'category'
  | 'brand'
  | 'currentPrice'
  | 'originalPrice'
  | 'productCost'
  | 'rating'
  | 'ratingCount'
  | 'description'
  | 'reviewText'
  | 'productUrl'
  | 'imageUrl'
  | 'currency'

export type InventoryField =
  | 'sku'
  | 'availableInventory'
  | 'reservedInventory'
  | 'warehouse'
  | 'incomingInventory'
  | 'reorderLevel'

export type FieldName = SalesField | ProductField | InventoryField

export interface FieldDefinition {
  field: FieldName
  label: string
  required: boolean
  description?: string
  valueType: 'text' | 'number' | 'currency' | 'percent' | 'date' | 'integer'
}

/** Mapping of one target field to a source column for a single file. */
export interface ColumnMapping {
  field: FieldName
  sourceColumn: string | null
  confidence: 'high' | 'medium' | 'low' | 'none'
}

export interface FileMapping {
  fileId: string
  datasetKind: DatasetKind
  mappings: ColumnMapping[]
}

// ---- Cleaning & validation ----------------------------------------------

export type RowAcceptance = 'accepted' | 'warning' | 'rejected'

export interface RowIssue {
  field: string
  message: string
}

export interface ProcessedRow<T> {
  rowIndex: number
  fileId: string
  acceptance: RowAcceptance
  issues: RowIssue[]
  raw: RawRow
  value: T | null
}

export interface SalesRecord {
  orderId: string
  orderDate: Date | null
  sku: string
  quantity: number
  sellingPrice: number
  productCost?: number
  orderStatus?: string
  discount?: number
  currency?: string
}

export interface ProductRecord {
  sku: string
  productName: string
  category?: string
  brand?: string
  currentPrice?: number
  originalPrice?: number
  productCost?: number
  rating?: number
  ratingCount?: number
  description?: string
  reviewText?: string
  productUrl?: string
  imageUrl?: string
  currency?: string
}

export interface InventoryRecord {
  sku: string
  availableInventory: number
  reservedInventory?: number
  warehouse?: string
  incomingInventory?: number
  reorderLevel?: number
}

// ---- Data quality ---------------------------------------------------------

export interface DataQualityReport {
  unmatchedProductIds: { sku: string; source: DatasetKind }[]
  invalidDates: ProcessedRow<unknown>[]
  invalidQuantities: ProcessedRow<unknown>[]
  unparseablePrices: ProcessedRow<unknown>[]
  duplicateSalesRows: ProcessedRow<unknown>[]
  conflictingProductRecords: { sku: string; fields: string[]; records: ProductRecord[] }[]
  missingInventory: { sku: string }[]
  rejectedRows: { datasetKind: DatasetKind; row: ProcessedRow<unknown> }[]
}

// ---- Signals ---------------------------------------------------------------

export type SignalId =
  | 'out-of-stock'
  | 'restock-attention'
  | 'sales-decline'
  | 'fast-growing'
  | 'slow-moving-inventory'
  | 'margin-concern'
  | 'reputation-concern'
  | 'promising-reputation'
  | 'price-integrity-risk'
  | 'data-quality-hold'

export type SignalSeverity = 'high' | 'medium' | 'low'

export interface SupportingValue {
  label: string
  value: string
}

export interface ProductSignal {
  id: SignalId
  severity: SignalSeverity
  title: string
  detected: string
  supportingValues: SupportingValue[]
  whyItMatters: string
  suggestedInvestigation: string
  limitation: string
}

// ---- Joined product performance ---------------------------------------------

export interface ProductPerformance {
  sku: string
  productName: string
  category?: string
  brand?: string
  currentPrice?: number
  originalPrice?: number
  productCost?: number
  rating?: number
  ratingCount?: number
  description?: string
  reviewText?: string
  productUrl?: string
  imageUrl?: string
  /** The product's own currency, from an optional per-row currency column in
   * the catalog file. Falls back to the dataset-wide detected currency when
   * absent — see AnalysisResult.currency. */
  currency?: string

  hasSalesData: boolean
  hasInventoryData: boolean

  revenueCurrent?: number
  revenuePrevious?: number
  unitsCurrent?: number
  unitsPrevious?: number
  ordersCurrent?: number
  ordersPrevious?: number
  avgOrderValue?: number
  grossProfit?: number
  grossMargin?: number
  salesChangePct?: number
  avgDailyUnits?: number
  revenueDeclineContributionPct?: number

  availableInventory?: number
  reservedInventory?: number
  incomingInventory?: number
  warehouses?: string[]
  daysOfInventory?: number

  signals: ProductSignal[]
  primarySignal?: ProductSignal
}

export interface PeriodWindow {
  start: Date
  end: Date
}

export interface AnalysisPeriod {
  lengthDays: 7 | 30
  current: PeriodWindow
  previous: PeriodWindow | null
  hasSufficientHistory: boolean
  datasetLatestDate: Date | null
}

export interface KpiValue {
  current: number
  previous?: number
  changePct?: number
}

export interface KpiSummary {
  revenue?: KpiValue
  orders?: KpiValue
  units?: KpiValue
  avgOrderValue?: KpiValue
}

export type AnalysisMode = 'full' | 'catalog-only'

export interface DailySalesPoint {
  date: string
  revenue: number
  orders: number
  units: number
}

export interface AnalysisResult {
  mode: AnalysisMode
  products: ProductPerformance[]
  kpis: KpiSummary
  period: AnalysisPeriod | null
  dataQuality: DataQualityReport
  datasetsPresent: DatasetKind[]
  dailySeries: DailySalesPoint[]
  currency: string
}
