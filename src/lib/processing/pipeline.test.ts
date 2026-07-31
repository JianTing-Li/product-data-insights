import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCsv } from '@/lib/csv/parseCsv'
import { detectDatasetKind } from './detectDatasetKind'
import { createFileMapping } from './mapColumns'
import { runPipeline } from './pipeline'
import type { AddedFile, FileMapping } from './types'

const SAMPLE_DIR = resolve(__dirname, '../../../public/sample-data')

function loadAsAddedFile(filename: string): { file: AddedFile; mapping: FileMapping } {
  const text = readFileSync(resolve(SAMPLE_DIR, filename), 'utf8')
  const { headers, rows, issues } = parseCsv(text)
  const detection = detectDatasetKind(headers)
  const file: AddedFile = {
    id: filename,
    filename,
    source: 'upload',
    sizeBytes: text.length,
    status: 'parsed',
    datasetKind: detection.kind,
    detectionConfidence: detection.confidence,
    headers,
    rowCount: rows.length,
    rows,
    parseIssues: issues,
  }
  const mapping = createFileMapping(filename, detection.kind, headers)
  return { file, mapping }
}

describe('runPipeline (integration, real sample data)', () => {
  const sales = loadAsAddedFile('walmart-sales.csv')
  const products = loadAsAddedFile('walmart-products.csv')
  const inventory = loadAsAddedFile('walmart-inventory.csv')

  const files = [sales.file, products.file, inventory.file]
  const mappings: Record<string, FileMapping> = {
    [sales.file.id]: sales.mapping,
    [products.file.id]: products.mapping,
    [inventory.file.id]: inventory.mapping,
  }

  it('detects all three dataset kinds correctly from real headers', () => {
    expect(sales.file.datasetKind).toBe('sales')
    expect(products.file.datasetKind).toBe('products')
    expect(inventory.file.datasetKind).toBe('inventory')
  })

  it('runs end to end and reports full mode with all datasets present', () => {
    const result = runPipeline(files, mappings, 7)
    expect(result.mode).toBe('full')
    expect(result.datasetsPresent.sort()).toEqual(['inventory', 'products', 'sales'])
  })

  it('computes a valid analysis period from the real order dates', () => {
    const result = runPipeline(files, mappings, 7)
    expect(result.period).not.toBeNull()
    expect(result.period?.hasSufficientHistory).toBe(true)
  })

  it('deduplicates the catalog and flags the seeded conflicting product record', () => {
    const result = runPipeline(files, mappings, 7)
    expect(result.dataQuality.conflictingProductRecords).toHaveLength(1)
    expect(result.dataQuality.conflictingProductRecords[0].sku).toBe('5344195287')
    // Only one joined product for that SKU despite two source rows (grain-safe dedup).
    expect(result.products.filter((p) => p.sku === '5344195287')).toHaveLength(1)
  })

  it('flags the seeded unmatched product ID from the sales file', () => {
    const result = runPipeline(files, mappings, 7)
    expect(result.dataQuality.unmatchedProductIds).toContainEqual({ sku: 'WALMART-UNKNOWN-999', source: 'sales' })
  })

  it('flags the seeded product with no inventory record', () => {
    const result = runPipeline(files, mappings, 7)
    expect(result.dataQuality.missingInventory.map((m) => m.sku)).toContain('6013308220')
  })

  it('flags the seeded invalid quantity, unparseable price, invalid date, and duplicate row', () => {
    const result = runPipeline(files, mappings, 7)
    expect(result.dataQuality.invalidQuantities.length).toBeGreaterThan(0)
    expect(result.dataQuality.unparseablePrices.length).toBeGreaterThan(0)
    expect(result.dataQuality.invalidDates.length).toBeGreaterThan(0)
    expect(result.dataQuality.duplicateSalesRows.length).toBeGreaterThan(0)
  })

  it('never discards rejected rows silently — every rejection has a preserved reason', () => {
    const result = runPipeline(files, mappings, 7)
    expect(result.dataQuality.rejectedRows.length).toBeGreaterThan(0)
    for (const { row } of result.dataQuality.rejectedRows) {
      expect(row.issues.length).toBeGreaterThan(0)
    }
  })

  it('joins the real out-of-stock product with zero available inventory', () => {
    const result = runPipeline(files, mappings, 7)
    const product = result.products.find((p) => p.sku === '161657830')
    expect(product?.hasInventoryData).toBe(true)
    expect(product?.availableInventory).toBe(0)
  })

  it('sums inventory across the two warehouses for a normal product', () => {
    const result = runPipeline(files, mappings, 7)
    const product = result.products.find((p) => p.sku === '669112285')
    expect(product?.warehouses).toEqual(['WH-EAST', 'WH-WEST'])
    expect(product?.availableInventory).toBeGreaterThan(0)
  })

  it('preserves the real product ID text exactly (no case/format changes)', () => {
    const result = runPipeline(files, mappings, 7)
    expect(result.products.some((p) => p.sku === '669112285')).toBe(true)
  })

  it('reports catalog-only mode when only the product file is present', () => {
    const catalogOnly = loadAsAddedFile('walmart-products.csv')
    const result = runPipeline([catalogOnly.file], { [catalogOnly.file.id]: catalogOnly.mapping }, 7)
    expect(result.mode).toBe('catalog-only')
    expect(result.period).toBeNull()
    expect(result.products.length).toBeGreaterThan(0)
  })

  it('falls back to the product catalog currency when there is no sales data at all', () => {
    const headers = ['product_id', 'product_name', 'final_price', 'currency']
    const rows = [
      { product_id: 'A', product_name: 'Widget', final_price: '868', currency: 'MXN' },
      { product_id: 'B', product_name: 'Gadget', final_price: '199', currency: 'MXN' },
    ]
    const detection = detectDatasetKind(headers)
    const file: AddedFile = {
      id: 'synthetic-products',
      filename: 'synthetic-products.csv',
      source: 'upload',
      sizeBytes: 100,
      status: 'parsed',
      datasetKind: detection.kind,
      detectionConfidence: detection.confidence,
      headers,
      rowCount: rows.length,
      rows,
      parseIssues: [],
    }
    const mapping = createFileMapping(file.id, detection.kind, headers)
    const result = runPipeline([file], { [file.id]: mapping }, 7)
    expect(result.mode).toBe('catalog-only')
    expect(result.currency).toBe('MXN')
    expect(result.products.find((p) => p.sku === 'A')?.currency).toBe('MXN')
  })
})
