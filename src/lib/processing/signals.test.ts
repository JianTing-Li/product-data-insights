import { describe, expect, it } from 'vitest'
import { generateProductSignals } from './signals'
import type { DataQualityReport, ProductPerformance } from './types'

function product(overrides: Partial<ProductPerformance> = {}): ProductPerformance {
  return { sku: 'A', productName: 'Widget', hasSalesData: true, hasInventoryData: true, signals: [], ...overrides }
}

function emptyDataQuality(): DataQualityReport {
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

function idsOf(p: ProductPerformance): string[] {
  return p.signals.map((s) => s.id)
}

describe('out-of-stock signal', () => {
  it('fires when available inventory is zero for a product with sales history', () => {
    const p = product({ availableInventory: 0, hasInventoryData: true, hasSalesData: true })
    const result = generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' })
    expect(idsOf(result)).toContain('out-of-stock')
    expect(result.primarySignal?.id).toBe('out-of-stock')
  })

  it('does not fire when inventory is positive', () => {
    const p = product({ availableInventory: 10, hasInventoryData: true, hasSalesData: true })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('out-of-stock')
  })

  it('does not fire without inventory data', () => {
    const p = product({ hasInventoryData: false, hasSalesData: true })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('out-of-stock')
  })

  it('does not fire for a product with zero inventory but no sales history', () => {
    const p = product({ availableInventory: 0, hasInventoryData: true, hasSalesData: false })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('out-of-stock')
  })
})

describe('restock-attention signal', () => {
  it('fires when days of inventory is low but positive', () => {
    const p = product({ hasInventoryData: true, daysOfInventory: 5 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).toContain('restock-attention')
  })

  it('does not fire when days of inventory is zero (that is out-of-stock territory)', () => {
    const p = product({ hasInventoryData: true, daysOfInventory: 0 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('restock-attention')
  })

  it('does not fire when days of inventory is comfortably high', () => {
    const p = product({ hasInventoryData: true, daysOfInventory: 30 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('restock-attention')
  })
})

describe('sales-decline signal', () => {
  it('fires on a significant revenue drop', () => {
    const p = product({ salesChangePct: -0.42 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).toContain('sales-decline')
  })

  it('does not fire on a mild decline below the threshold', () => {
    const p = product({ salesChangePct: -0.05 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('sales-decline')
  })

  it('does not fire when sales change is undefined (insufficient history)', () => {
    const p = product({})
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('sales-decline')
  })
})

describe('fast-growing signal', () => {
  it('fires on strong revenue growth', () => {
    const p = product({ salesChangePct: 0.65 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).toContain('fast-growing')
  })

  it('does not fire on mild growth below the threshold', () => {
    const p = product({ salesChangePct: 0.05 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('fast-growing')
  })
})

describe('slow-moving-inventory signal', () => {
  it('fires when days of inventory is very high', () => {
    const p = product({ hasInventoryData: true, daysOfInventory: 134 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).toContain('slow-moving-inventory')
  })

  it('does not fire for a healthy days-of-inventory value', () => {
    const p = product({ hasInventoryData: true, daysOfInventory: 20 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('slow-moving-inventory')
  })

  it('does not fire for infinite days of inventory (zero sales pace is a different concern)', () => {
    const p = product({ hasInventoryData: true, daysOfInventory: Infinity })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('slow-moving-inventory')
  })
})

describe('margin-concern signal', () => {
  it('fires on thin gross margin', () => {
    const p = product({ grossMargin: 0.04 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).toContain('margin-concern')
  })

  it('does not fire on healthy margin', () => {
    const p = product({ grossMargin: 0.45 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('margin-concern')
  })

  it('does not fire when margin is unknown', () => {
    const p = product({})
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('margin-concern')
  })
})

describe('reputation-concern signal', () => {
  it('fires on a low rating with meaningful volume', () => {
    const p = product({ rating: 2.8, ratingCount: 340 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).toContain('reputation-concern')
  })

  it('does not fire on a low rating with too little volume to be meaningful', () => {
    const p = product({ rating: 2.8, ratingCount: 3 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('reputation-concern')
  })

  it('does not fire on a healthy rating', () => {
    const p = product({ rating: 4.2, ratingCount: 340 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('reputation-concern')
  })
})

describe('promising-reputation signal', () => {
  it('fires on a high rating with meaningful volume', () => {
    const p = product({ rating: 4.8, ratingCount: 512 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).toContain('promising-reputation')
  })

  it('does not fire on a high rating with too little volume', () => {
    const p = product({ rating: 4.8, ratingCount: 10 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('promising-reputation')
  })

  it('does not fire on a mediocre rating', () => {
    const p = product({ rating: 4.0, ratingCount: 512 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('promising-reputation')
  })
})

describe('price-integrity-risk signal', () => {
  it('fires when current price exceeds original price', () => {
    const p = product({ currentPrice: 45, originalPrice: 39 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).toContain('price-integrity-risk')
  })

  it('does not fire for a normal discount (current below original)', () => {
    const p = product({ currentPrice: 30, originalPrice: 39 })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('price-integrity-risk')
  })

  it('fires when the average selling price deviates notably from the catalog price', () => {
    const p = product({ currentPrice: 100, revenueCurrent: 600, unitsCurrent: 10, hasSalesData: true }) // implied price 60
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).toContain('price-integrity-risk')
  })

  it('does not fire when the average selling price is close to the catalog price', () => {
    const p = product({ currentPrice: 100, revenueCurrent: 990, unitsCurrent: 10, hasSalesData: true }) // implied price 99
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('price-integrity-risk')
  })
})

describe('data-quality-hold signal', () => {
  it('fires when the product ID is unmatched in another dataset', () => {
    const p = product({ sku: 'X' })
    const dq = { ...emptyDataQuality(), unmatchedProductIds: [{ sku: 'X', source: 'sales' as const }] }
    expect(idsOf(generateProductSignals(p, { dataQuality: dq, currency: 'USD' }))).toContain('data-quality-hold')
  })

  it('fires when the product has a conflicting duplicate catalog record', () => {
    const p = product({ sku: 'X' })
    const dq = { ...emptyDataQuality(), conflictingProductRecords: [{ sku: 'X', fields: ['currentPrice'], records: [] }] }
    expect(idsOf(generateProductSignals(p, { dataQuality: dq, currency: 'USD' }))).toContain('data-quality-hold')
  })

  it('does not fire for a clean product', () => {
    const p = product({ sku: 'X' })
    expect(idsOf(generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' }))).not.toContain('data-quality-hold')
  })
})

describe('primary signal selection', () => {
  it('picks the highest-priority signal as primary when several fire', () => {
    const p = product({
      availableInventory: 0,
      hasInventoryData: true,
      hasSalesData: true,
      salesChangePct: -0.5,
    })
    const result = generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' })
    expect(result.signals.length).toBeGreaterThan(1)
    expect(result.primarySignal?.id).toBe('out-of-stock') // out-of-stock outranks sales-decline
  })

  it('leaves primarySignal undefined for a product with no signals', () => {
    const p = product({})
    const result = generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' })
    expect(result.signals).toHaveLength(0)
    expect(result.primarySignal).toBeUndefined()
  })
})

describe('signal content requirements', () => {
  it('every generated signal includes detected, supporting values, why it matters, suggested investigation, and a limitation', () => {
    const p = product({ salesChangePct: -0.5 })
    const result = generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' })
    for (const signal of result.signals) {
      expect(signal.detected).toBeTruthy()
      expect(signal.supportingValues.length).toBeGreaterThan(0)
      expect(signal.whyItMatters).toBeTruthy()
      expect(signal.suggestedInvestigation).toBeTruthy()
      expect(signal.limitation).toBeTruthy()
    }
  })

  it('uses investigative language, not directive commands', () => {
    const p = product({ salesChangePct: -0.5, grossMargin: 0.02, rating: 2.0, ratingCount: 100 })
    const result = generateProductSignals(p, { dataQuality: emptyDataQuality(), currency: 'USD' })
    const bannedPhrases = ['order more inventory', 'remove this product', 'change the price', 'you should']
    for (const signal of result.signals) {
      const text = `${signal.suggestedInvestigation} ${signal.whyItMatters}`.toLowerCase()
      for (const phrase of bannedPhrases) {
        expect(text).not.toContain(phrase)
      }
    }
  })
})
