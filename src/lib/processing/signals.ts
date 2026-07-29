import { formatCurrency, formatDays, formatNumber, formatPercent } from '@/lib/format'
import { SIGNAL_PRIORITY, SIGNAL_THRESHOLDS } from './signalsConfig'
import type { DataQualityReport, ProductPerformance, ProductSignal } from './types'

export interface SignalContext {
  dataQuality: DataQualityReport
  currency: string
}

function checkDataQualityHold(product: ProductPerformance, ctx: SignalContext): ProductSignal | null {
  const unmatched = ctx.dataQuality.unmatchedProductIds.filter((u) => u.sku === product.sku)
  const conflict = ctx.dataQuality.conflictingProductRecords.find((c) => c.sku === product.sku)

  if (unmatched.length === 0 && !conflict) return null

  const supportingValues = []
  if (unmatched.length > 0) {
    supportingValues.push({ label: 'Referenced without a catalog match', value: unmatched.map((u) => u.source).join(', ') })
  }
  if (conflict) {
    supportingValues.push({ label: 'Conflicting fields', value: conflict.fields.join(', ') })
  }

  return {
    id: 'data-quality-hold',
    severity: 'low',
    title: 'Data-quality hold',
    detected: unmatched.length > 0
      ? 'This product ID appears in other files but has no matching product catalog record.'
      : 'This product ID appears more than once in the catalog with conflicting values.',
    supportingValues,
    whyItMatters: 'Metrics for this product may be incomplete or unreliable until the underlying data is reconciled.',
    suggestedInvestigation: 'Review the source files for typos, formatting differences, or duplicate exports for this product ID.',
    limitation: 'This flag only checks for structural inconsistencies across your files, not whether the values themselves are correct.',
  }
}

function checkOutOfStock(product: ProductPerformance): ProductSignal | null {
  if (!product.hasInventoryData || !product.hasSalesData) return null
  if (product.availableInventory !== 0) return null

  return {
    id: 'out-of-stock',
    severity: 'high',
    title: 'Out of stock',
    detected: 'Available inventory is 0 across all warehouses for a product with recent sales history.',
    supportingValues: [
      { label: 'Available inventory', value: formatNumber(0) },
      { label: 'Units sold (previous period)', value: formatNumber(product.unitsPrevious ?? 0) },
    ],
    whyItMatters: 'A product that can’t be purchased stops generating revenue and may push customers to a competitor.',
    suggestedInvestigation: 'Verify the inventory feed is current, then investigate with your supplier or warehouse team.',
    limitation: 'Inventory reflects the file provided at upload time and may not match your live system.',
  }
}

function checkRestockAttention(product: ProductPerformance): ProductSignal | null {
  if (!product.hasInventoryData || product.daysOfInventory === undefined) return null
  if (product.daysOfInventory <= 0 || product.daysOfInventory > SIGNAL_THRESHOLDS.restockAttentionMaxDays) return null

  return {
    id: 'restock-attention',
    severity: 'medium',
    title: 'Restock attention',
    detected: `Days of inventory has fallen to ${formatDays(product.daysOfInventory)} at the current sales pace.`,
    supportingValues: [
      { label: 'Days of inventory', value: formatDays(product.daysOfInventory) },
      { label: 'Available inventory', value: formatNumber(product.availableInventory) },
      { label: 'Avg daily units', value: product.avgDailyUnits?.toFixed(1) ?? '—' },
    ],
    whyItMatters: 'Running out of a selling product interrupts revenue and can hurt search ranking on some marketplaces.',
    suggestedInvestigation: 'Review upcoming incoming inventory and lead times with your supplier.',
    limitation: 'Days of inventory assumes the recent sales pace continues; seasonal shifts are not accounted for.',
  }
}

function checkSalesDecline(product: ProductPerformance, ctx: SignalContext): ProductSignal | null {
  if (product.salesChangePct === undefined || product.salesChangePct > SIGNAL_THRESHOLDS.salesDeclinePct) return null

  const supportingValues = [
    { label: 'Revenue (current period)', value: formatCurrency(product.revenueCurrent, ctx.currency) },
    { label: 'Revenue (previous period)', value: formatCurrency(product.revenuePrevious, ctx.currency) },
  ]
  if (product.revenueDeclineContributionPct !== undefined) {
    supportingValues.push({ label: 'Contribution to total revenue decline', value: formatPercent(product.revenueDeclineContributionPct) })
  }

  return {
    id: 'sales-decline',
    severity: 'high',
    title: 'Sales decline',
    detected: `Revenue changed ${formatPercent(product.salesChangePct, { signed: true })} compared with the preceding period.`,
    supportingValues,
    whyItMatters: 'A meaningful revenue drop may indicate a pricing, availability, ranking, or competitive change worth understanding.',
    suggestedInvestigation: 'Investigate whether price, availability, ranking, or competitor activity changed recently.',
    limitation: 'A single period can be noisy for lower-volume products; consider checking a longer window too.',
  }
}

function checkFastGrowing(product: ProductPerformance): ProductSignal | null {
  if (product.salesChangePct === undefined || product.salesChangePct < SIGNAL_THRESHOLDS.fastGrowingPct) return null

  return {
    id: 'fast-growing',
    severity: 'low',
    title: 'Fast-growing product',
    detected: `Revenue grew ${formatPercent(product.salesChangePct, { signed: true })} compared with the preceding period.`,
    supportingValues: [
      { label: 'Units sold (current period)', value: formatNumber(product.unitsCurrent) },
      { label: 'Units sold (previous period)', value: formatNumber(product.unitsPrevious) },
    ],
    whyItMatters: 'Consistent growth may indicate an opportunity worth understanding and protecting.',
    suggestedInvestigation: 'Consider testing whether increasing marketing spend or inventory buffer sustains the momentum.',
    limitation: 'Growth from a small base can look dramatic in percentage terms.',
  }
}

function checkSlowMovingInventory(product: ProductPerformance): ProductSignal | null {
  if (!product.hasInventoryData || product.daysOfInventory === undefined) return null
  if (!Number.isFinite(product.daysOfInventory) || product.daysOfInventory < SIGNAL_THRESHOLDS.slowMovingMinDays) return null

  return {
    id: 'slow-moving-inventory',
    severity: 'medium',
    title: 'Slow-moving inventory',
    detected: `Current inventory would take over ${formatDays(product.daysOfInventory)} to sell through at the recent pace.`,
    supportingValues: [
      { label: 'Days of inventory', value: formatDays(product.daysOfInventory) },
      { label: 'Avg daily units', value: product.avgDailyUnits?.toFixed(1) ?? '—' },
      { label: 'Available inventory', value: formatNumber(product.availableInventory) },
    ],
    whyItMatters: 'Capital tied up in slow-moving stock could be limiting cash flow or warehouse space.',
    suggestedInvestigation: 'Review whether pricing, placement, or seasonality explain the slow pace before acting.',
    limitation: 'Does not account for planned promotions or seasonal demand ahead.',
  }
}

function checkMarginConcern(product: ProductPerformance, ctx: SignalContext): ProductSignal | null {
  if (product.grossMargin === undefined || product.grossMargin >= SIGNAL_THRESHOLDS.lowMarginThreshold) return null

  return {
    id: 'margin-concern',
    severity: 'medium',
    title: 'Margin concern',
    detected: `Gross margin is ${formatPercent(product.grossMargin)}, below the typical healthy range.`,
    supportingValues: [
      { label: 'Gross margin', value: formatPercent(product.grossMargin) },
      { label: 'Revenue (current period)', value: formatCurrency(product.revenueCurrent, ctx.currency) },
      { label: 'Gross profit (current period)', value: formatCurrency(product.grossProfit, ctx.currency) },
    ],
    whyItMatters: 'Thin margins mean this product may be contributing little profit despite selling.',
    suggestedInvestigation: 'Verify product cost data is current, then review pricing and discount levels.',
    limitation: 'Margin is only as accurate as the product cost supplied in your files.',
  }
}

function checkReputationConcern(product: ProductPerformance): ProductSignal | null {
  if (product.rating === undefined || product.ratingCount === undefined) return null
  if (product.rating >= SIGNAL_THRESHOLDS.reputationConcernMaxRating) return null
  if (product.ratingCount < SIGNAL_THRESHOLDS.reputationConcernMinRatingCount) return null

  return {
    id: 'reputation-concern',
    severity: 'high',
    title: 'Reputation concern',
    detected: `Average rating is ${product.rating.toFixed(1)} out of 5 across ${formatNumber(product.ratingCount)} ratings.`,
    supportingValues: [
      { label: 'Rating', value: `${product.rating.toFixed(1)} / 5` },
      { label: 'Rating count', value: formatNumber(product.ratingCount) },
    ],
    whyItMatters: 'Low ratings at meaningful volume can suppress conversion and increase return rates.',
    suggestedInvestigation: 'Review recent reviews for recurring complaints such as quality or shipping issues.',
    limitation: 'A rating snapshot does not show trend direction without historical rating data.',
  }
}

function checkPromisingReputation(product: ProductPerformance): ProductSignal | null {
  if (product.rating === undefined || product.ratingCount === undefined) return null
  if (product.rating < SIGNAL_THRESHOLDS.promisingReputationMinRating) return null
  if (product.ratingCount < SIGNAL_THRESHOLDS.promisingReputationMinRatingCount) return null

  return {
    id: 'promising-reputation',
    severity: 'low',
    title: 'Promising reputation',
    detected: `Average rating is ${product.rating.toFixed(1)} out of 5 across ${formatNumber(product.ratingCount)} ratings.`,
    supportingValues: [
      { label: 'Rating', value: `${product.rating.toFixed(1)} / 5` },
      { label: 'Rating count', value: formatNumber(product.ratingCount) },
    ],
    whyItMatters: 'A strong, well-supported rating may indicate an opportunity to feature or expand this product.',
    suggestedInvestigation: 'Consider testing increased visibility for this product in merchandising placements.',
    limitation: 'Rating volume and recency can vary in reliability across marketplaces.',
  }
}

function checkPriceIntegrityRisk(product: ProductPerformance, ctx: SignalContext): ProductSignal | null {
  if (product.currentPrice !== undefined && product.originalPrice !== undefined && product.currentPrice > product.originalPrice) {
    return {
      id: 'price-integrity-risk',
      severity: 'medium',
      title: 'Price-integrity risk',
      detected: 'Current price is higher than the original list price, which is unusual for a discount listing.',
      supportingValues: [
        { label: 'Current price', value: formatCurrency(product.currentPrice, ctx.currency) },
        { label: 'Original price', value: formatCurrency(product.originalPrice, ctx.currency) },
      ],
      whyItMatters: 'Pricing that looks inconsistent can affect customer trust and marketplace compliance.',
      suggestedInvestigation: 'Verify the source price fields and confirm which price is currently live.',
      limitation: 'This compares two fields in your file and does not confirm what shoppers currently see.',
    }
  }

  if (
    product.hasSalesData &&
    product.currentPrice !== undefined &&
    product.currentPrice > 0 &&
    product.revenueCurrent !== undefined &&
    product.unitsCurrent !== undefined &&
    product.unitsCurrent > 0
  ) {
    const impliedPrice = product.revenueCurrent / product.unitsCurrent
    const deviation = Math.abs(impliedPrice - product.currentPrice) / product.currentPrice
    if (deviation >= SIGNAL_THRESHOLDS.priceIntegrityMinDeviationPct) {
      return {
        id: 'price-integrity-risk',
        severity: 'medium',
        title: 'Price-integrity risk',
        detected: 'The average price customers actually paid differs notably from the catalog price.',
        supportingValues: [
          { label: 'Catalog price', value: formatCurrency(product.currentPrice, ctx.currency) },
          { label: 'Average selling price', value: formatCurrency(impliedPrice, ctx.currency) },
        ],
        whyItMatters: 'A gap between catalog and actual selling price may point to discounting or a stale catalog feed.',
        suggestedInvestigation: 'Verify whether discounts, promotions, or a catalog sync issue explain the difference.',
        limitation: 'Average selling price is derived from sales rows and may reflect a mix of promotions over the period.',
      }
    }
  }

  return null
}

const SIGNAL_CHECKS: ((product: ProductPerformance, ctx: SignalContext) => ProductSignal | null)[] = [
  (p, ctx) => checkDataQualityHold(p, ctx),
  (p) => checkOutOfStock(p),
  (p, ctx) => checkPriceIntegrityRisk(p, ctx),
  (p, ctx) => checkSalesDecline(p, ctx),
  (p, ctx) => checkMarginConcern(p, ctx),
  (p) => checkReputationConcern(p),
  (p) => checkRestockAttention(p),
  (p) => checkSlowMovingInventory(p),
  (p) => checkFastGrowing(p),
  (p) => checkPromisingReputation(p),
]

function pickPrimarySignal(signals: ProductSignal[]): ProductSignal | undefined {
  if (signals.length === 0) return undefined
  return [...signals].sort((a, b) => SIGNAL_PRIORITY.indexOf(a.id) - SIGNAL_PRIORITY.indexOf(b.id))[0]
}

/** Runs every signal check against a product and attaches the resulting
 * signal list plus a single primary signal (by priority) for Overview
 * display. A product may internally qualify for several signals; only the
 * highest-priority one is surfaced as primary. */
export function generateProductSignals(product: ProductPerformance, ctx: SignalContext): ProductPerformance {
  const signals = SIGNAL_CHECKS.map((check) => check(product, ctx)).filter((s): s is ProductSignal => s !== null)
  return { ...product, signals, primarySignal: pickPrimarySignal(signals) }
}
