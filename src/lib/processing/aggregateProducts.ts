import type { ProductRecord } from './types'

export interface ProductConflict {
  sku: string
  fields: string[]
  records: ProductRecord[]
}

export interface DedupedProducts {
  products: ProductRecord[]
  conflicts: ProductConflict[]
}

const COMPARABLE_FIELDS: (keyof ProductRecord)[] = [
  'productName',
  'category',
  'brand',
  'currentPrice',
  'originalPrice',
  'productCost',
  'rating',
  'ratingCount',
  'description',
  'reviewText',
  'productUrl',
  'imageUrl',
]

function findDifferingFields(records: ProductRecord[]): string[] {
  const differing: string[] = []
  for (const field of COMPARABLE_FIELDS) {
    const values = new Set(records.map((r) => JSON.stringify(r[field] ?? null)))
    if (values.size > 1) differing.push(field)
  }
  return differing
}

/** Deduplicates the product catalog by product ID only — never by name, so
 * two genuinely different products that happen to share a name are never
 * merged. The first occurrence of each SKU is kept as the canonical record;
 * later occurrences with differing field values are reported as conflicts
 * rather than silently overwritten or discarded. */
export function deduplicateProducts(records: ProductRecord[]): DedupedProducts {
  const bySku = new Map<string, ProductRecord[]>()
  for (const record of records) {
    const list = bySku.get(record.sku)
    if (list) list.push(record)
    else bySku.set(record.sku, [record])
  }

  const products: ProductRecord[] = []
  const conflicts: ProductConflict[] = []

  for (const [sku, list] of bySku) {
    products.push(list[0])
    if (list.length > 1) {
      const fields = findDifferingFields(list)
      if (fields.length > 0) {
        conflicts.push({ sku, fields, records: list })
      }
    }
  }

  return { products, conflicts }
}
