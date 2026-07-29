import type { AggregatedInventory } from './aggregateInventory'
import type { ProductSalesAggregate } from './aggregateSales'
import type { DatasetKind, ProductPerformance, ProductRecord } from './types'

export interface JoinInput {
  products: ProductRecord[] // already deduplicated
  salesAggregates: Map<string, ProductSalesAggregate> // already aggregated by product + period
  inventoryAggregates: Map<string, AggregatedInventory> // already aggregated across warehouses
}

export interface JoinResult {
  products: ProductPerformance[] // metrics/signals not yet computed — that's the next pipeline stage
  unmatchedProductIds: { sku: string; source: DatasetKind }[]
}

/** Joins the three already-aggregated/deduplicated datasets by product ID.
 * Joining only happens after each source has been aggregated to one row per
 * product (or per product+period for sales), so a one-to-many relationship
 * in the source data (e.g. multiple warehouse rows, multiple order lines)
 * can never fan out into duplicated result rows here. A product appearing
 * in only some of the three sources is still included, with the missing
 * sides tracked via hasSalesData/hasInventoryData and unmatchedProductIds. */
export function joinDatasets(input: JoinInput): JoinResult {
  const allSkus = new Set<string>()
  for (const p of input.products) allSkus.add(p.sku)
  for (const sku of input.salesAggregates.keys()) allSkus.add(sku)
  for (const sku of input.inventoryAggregates.keys()) allSkus.add(sku)

  const productsBySku = new Map(input.products.map((p) => [p.sku, p]))
  const unmatchedProductIds: { sku: string; source: DatasetKind }[] = []
  const products: ProductPerformance[] = []

  for (const sku of allSkus) {
    const product = productsBySku.get(sku)
    const salesAgg = input.salesAggregates.get(sku)
    const invAgg = input.inventoryAggregates.get(sku)

    if (!product) {
      if (salesAgg) unmatchedProductIds.push({ sku, source: 'sales' })
      if (invAgg) unmatchedProductIds.push({ sku, source: 'inventory' })
    }

    products.push({
      sku,
      productName: product?.productName ?? `Unknown product (${sku})`,
      category: product?.category,
      brand: product?.brand,
      currentPrice: product?.currentPrice,
      originalPrice: product?.originalPrice,
      productCost: product?.productCost,
      rating: product?.rating,
      ratingCount: product?.ratingCount,
      description: product?.description,
      reviewText: product?.reviewText,
      productUrl: product?.productUrl,
      imageUrl: product?.imageUrl,

      hasSalesData: salesAgg !== undefined,
      hasInventoryData: invAgg !== undefined,

      revenueCurrent: salesAgg?.current.revenue,
      revenuePrevious: salesAgg?.previous?.revenue,
      unitsCurrent: salesAgg?.current.unitsSold,
      unitsPrevious: salesAgg?.previous?.unitsSold,
      ordersCurrent: salesAgg ? salesAgg.current.distinctOrderIds.size : undefined,
      ordersPrevious: salesAgg?.previous ? salesAgg.previous.distinctOrderIds.size : undefined,

      availableInventory: invAgg?.availableInventory,
      reservedInventory: invAgg?.reservedInventory,
      incomingInventory: invAgg?.incomingInventory,
      warehouses: invAgg?.warehouses,

      signals: [],
    })
  }

  return { products, unmatchedProductIds }
}
