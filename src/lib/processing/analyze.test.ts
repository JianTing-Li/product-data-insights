import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCsv } from '@/lib/csv/parseCsv'
import { runFullAnalysis } from './analyze'
import { detectDatasetKind } from './detectDatasetKind'
import { createFileMapping } from './mapColumns'
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
  return { file, mapping: createFileMapping(filename, detection.kind, headers) }
}

describe('runFullAnalysis (integration, real sample data)', () => {
  const sales = loadAsAddedFile('amazon-sales.csv')
  const products = loadAsAddedFile('amazon-products.csv')
  const inventory = loadAsAddedFile('amazon-inventory.csv')
  const files = [sales.file, products.file, inventory.file]
  const mappings: Record<string, FileMapping> = {
    [sales.file.id]: sales.mapping,
    [products.file.id]: products.mapping,
    [inventory.file.id]: inventory.mapping,
  }

  it('produces dataset-level KPIs', () => {
    const result = runFullAnalysis(files, mappings, 7)
    expect(result.kpis.revenue?.current).toBeGreaterThan(0)
    expect(result.kpis.orders?.current).toBeGreaterThan(0)
    expect(result.kpis.avgOrderValue?.current).toBeGreaterThan(0)
  })

  it('flags the seeded out-of-stock product with a primary out-of-stock signal', () => {
    const result = runFullAnalysis(files, mappings, 7)
    const product = result.products.find((p) => p.sku === 'B07KCMR8D6')
    expect(product?.availableInventory).toBe(0)
    expect(product?.primarySignal?.id).toBe('out-of-stock')
  })

  it('flags the seeded conflicting product record with a data-quality-hold signal', () => {
    const result = runFullAnalysis(files, mappings, 7)
    const product = result.products.find((p) => p.sku === 'B0BBVKRP7B')
    expect(product?.signals.some((s) => s.id === 'data-quality-hold')).toBe(true)
  })

  it('flags the seeded unmatched sales SKU with a data-quality-hold signal', () => {
    const result = runFullAnalysis(files, mappings, 7)
    const product = result.products.find((p) => p.sku === 'AMAZON-UNKNOWN-999')
    expect(product?.primarySignal?.id).toBe('data-quality-hold')
  })

  it('every product with a primary signal has full evidence content', () => {
    const result = runFullAnalysis(files, mappings, 7)
    const withSignals = result.products.filter((p) => p.primarySignal)
    expect(withSignals.length).toBeGreaterThan(0)
    for (const product of withSignals) {
      for (const signal of product.signals) {
        expect(signal.detected).toBeTruthy()
        expect(signal.supportingValues.length).toBeGreaterThan(0)
        expect(signal.whyItMatters).toBeTruthy()
        expect(signal.suggestedInvestigation).toBeTruthy()
        expect(signal.limitation).toBeTruthy()
      }
    }
  })

  it('computes catalog-only insights (no revenue/order metrics) when only a product file is uploaded', () => {
    const catalogOnly = loadAsAddedFile('amazon-products.csv')
    const result = runFullAnalysis([catalogOnly.file], { [catalogOnly.file.id]: catalogOnly.mapping }, 7)
    expect(result.mode).toBe('catalog-only')
    expect(result.kpis.revenue).toBeUndefined()
    expect(result.kpis.orders).toBeUndefined()
    expect(result.products.length).toBeGreaterThan(0)
  })

  it('still surfaces reputation signals in catalog-only mode from real rating data', () => {
    const catalogOnly = loadAsAddedFile('amazon-products.csv')
    const result = runFullAnalysis([catalogOnly.file], { [catalogOnly.file.id]: catalogOnly.mapping }, 7)
    const reputationSignals = result.products.filter((p) => p.signals.some((s) => s.id === 'reputation-concern' || s.id === 'promising-reputation'))
    expect(reputationSignals.length).toBeGreaterThan(0)
  })
})
