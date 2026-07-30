import { describe, expect, it } from 'vitest'
import { mapColumns } from './mapColumns'

function mappingFor(mappings: ReturnType<typeof mapColumns>, field: string) {
  return mappings.find((m) => m.field === field)
}

describe('mapColumns', () => {
  it('maps canonical labels with high confidence', () => {
    const headers = ['Order ID', 'Order date', 'Product ID or SKU', 'Quantity', 'Selling price']
    // "Product ID or SKU" won't exact-match any alias, but should still resolve via partial match.
    const mappings = mapColumns(headers, 'sales')
    expect(mappingFor(mappings, 'orderId')).toMatchObject({ sourceColumn: 'Order ID', confidence: 'high' })
    expect(mappingFor(mappings, 'orderDate')).toMatchObject({ sourceColumn: 'Order date', confidence: 'high' })
    expect(mappingFor(mappings, 'quantity')).toMatchObject({ sourceColumn: 'Quantity', confidence: 'high' })
    expect(mappingFor(mappings, 'sellingPrice')).toMatchObject({ sourceColumn: 'Selling price', confidence: 'high' })
  })

  it('maps snake_case headers with high confidence', () => {
    const headers = ['order_id', 'order_date', 'sku', 'quantity', 'selling_price', 'product_cost']
    const mappings = mapColumns(headers, 'sales')
    for (const field of ['orderId', 'orderDate', 'sku', 'quantity', 'sellingPrice', 'productCost']) {
      expect(mappingFor(mappings, field)?.confidence).toBe('high')
    }
  })

  it('maps the Amazon-style product CSV headers generically', () => {
    const headers = [
      'product_id',
      'product_name',
      'category',
      'discounted_price',
      'actual_price',
      'discount_percentage',
      'rating',
      'rating_count',
      'about_product',
      'user_id',
      'user_name',
      'review_id',
      'review_title',
      'review_content',
      'img_link',
      'product_link',
    ]
    const mappings = mapColumns(headers, 'products')
    expect(mappingFor(mappings, 'sku')).toMatchObject({ sourceColumn: 'product_id', confidence: 'high' })
    expect(mappingFor(mappings, 'productName')).toMatchObject({ sourceColumn: 'product_name', confidence: 'high' })
    expect(mappingFor(mappings, 'category')).toMatchObject({ sourceColumn: 'category', confidence: 'high' })
    expect(mappingFor(mappings, 'currentPrice')).toMatchObject({ sourceColumn: 'discounted_price', confidence: 'high' })
    expect(mappingFor(mappings, 'originalPrice')).toMatchObject({ sourceColumn: 'actual_price', confidence: 'high' })
    expect(mappingFor(mappings, 'rating')).toMatchObject({ sourceColumn: 'rating', confidence: 'high' })
    expect(mappingFor(mappings, 'ratingCount')).toMatchObject({ sourceColumn: 'rating_count', confidence: 'high' })
    expect(mappingFor(mappings, 'description')).toMatchObject({ sourceColumn: 'about_product', confidence: 'high' })
    expect(mappingFor(mappings, 'reviewText')).toMatchObject({ sourceColumn: 'review_content', confidence: 'high' })
    expect(mappingFor(mappings, 'imageUrl')).toMatchObject({ sourceColumn: 'img_link', confidence: 'high' })
    expect(mappingFor(mappings, 'productUrl')).toMatchObject({ sourceColumn: 'product_link', confidence: 'high' })
    // Brand has no corresponding column in this dataset and must not be forced onto an unrelated header.
    expect(mappingFor(mappings, 'brand')).toMatchObject({ sourceColumn: null, confidence: 'none' })
  })

  it('fuzzy-matches near-miss spellings at low confidence', () => {
    const headers = ['Order ID', 'Order date', 'sku', 'Quantiy', 'Selling price']
    const mappings = mapColumns(headers, 'sales')
    expect(mappingFor(mappings, 'quantity')).toMatchObject({ sourceColumn: 'Quantiy', confidence: 'low' })
  })

  it('leaves fields unmapped when no plausible column exists', () => {
    const headers = ['foo', 'bar', 'baz']
    const mappings = mapColumns(headers, 'sales')
    for (const m of mappings) {
      expect(m.sourceColumn).toBeNull()
      expect(m.confidence).toBe('none')
    }
  })

  it('never assigns the same source column to two different fields', () => {
    const headers = ['sku', 'price']
    const mappings = mapColumns(headers, 'products')
    const usedColumns = mappings.filter((m) => m.sourceColumn).map((m) => m.sourceColumn)
    expect(new Set(usedColumns).size).toBe(usedColumns.length)
  })

  it('maps Walmart product export headers, including scientific-notation-prone final_price', () => {
    const headers = [
      'timestamp', 'url', 'final_price', 'sku', 'currency', 'gtin', 'specifications', 'image_urls',
      'top_reviews', 'rating_stars', 'related_pages', 'available_for_delivery', 'available_for_pickup',
      'brand', 'breadcrumbs', 'category_ids', 'review_count', 'description', 'product_id', 'product_name',
      'review_tags', 'category_url', 'category_name', 'category_path', 'root_category_url',
      'root_category_name', 'upc', 'tags', 'main_image', 'rating', 'unit_price', 'unit', 'aisle',
      'free_returns', 'sizes', 'colors', 'seller', 'other_attributes', 'customer_reviews', 'ingredients',
      'initial_price', 'discount', 'ingredients_full', 'categories',
    ]
    const mappings = mapColumns(headers, 'products')
    expect(mappingFor(mappings, 'sku')).toMatchObject({ sourceColumn: 'sku', confidence: 'high' })
    expect(mappingFor(mappings, 'productName')).toMatchObject({ sourceColumn: 'product_name', confidence: 'high' })
    expect(mappingFor(mappings, 'currentPrice')).toMatchObject({ sourceColumn: 'final_price', confidence: 'high' })
    expect(mappingFor(mappings, 'originalPrice')).toMatchObject({ sourceColumn: 'initial_price', confidence: 'high' })
    expect(mappingFor(mappings, 'ratingCount')).toMatchObject({ sourceColumn: 'review_count', confidence: 'high' })
  })

  it('maps Shopee product export headers, including the bare "id" and "reviews" columns', () => {
    const headers = [
      'url', 'id', 'title', 'sold', 'rating', 'reviews', 'initial_price', 'final_price', 'currency',
      'stock', 'favorite', 'image', 'video', 'seller_name', 'shop_url', 'breadcrumb', 'brand',
      'category_id', 'domain', 'seller_id',
    ]
    const mappings = mapColumns(headers, 'products')
    expect(mappingFor(mappings, 'sku')).toMatchObject({ sourceColumn: 'id', confidence: 'high' })
    expect(mappingFor(mappings, 'productName')).toMatchObject({ sourceColumn: 'title', confidence: 'high' })
    expect(mappingFor(mappings, 'currentPrice')).toMatchObject({ sourceColumn: 'final_price', confidence: 'high' })
    expect(mappingFor(mappings, 'originalPrice')).toMatchObject({ sourceColumn: 'initial_price', confidence: 'high' })
    expect(mappingFor(mappings, 'ratingCount')).toMatchObject({ sourceColumn: 'reviews', confidence: 'high' })
    expect(mappingFor(mappings, 'category')).toMatchObject({ sourceColumn: 'breadcrumb', confidence: 'high' })
  })

  it('maps Shein product export headers, including reviews_count', () => {
    const headers = [
      'product_name', 'description', 'initial_price', 'final_price', 'currency', 'in_stock', 'color',
      'size', 'reviews_count', 'main_image', 'category_url', 'url', 'category_tree', 'country_code',
      'domain', 'product_id', 'rating', 'root_category', 'category', 'brand',
    ]
    const mappings = mapColumns(headers, 'products')
    expect(mappingFor(mappings, 'sku')).toMatchObject({ sourceColumn: 'product_id', confidence: 'high' })
    expect(mappingFor(mappings, 'productName')).toMatchObject({ sourceColumn: 'product_name', confidence: 'high' })
    expect(mappingFor(mappings, 'currentPrice')).toMatchObject({ sourceColumn: 'final_price', confidence: 'high' })
    expect(mappingFor(mappings, 'originalPrice')).toMatchObject({ sourceColumn: 'initial_price', confidence: 'high' })
    expect(mappingFor(mappings, 'ratingCount')).toMatchObject({ sourceColumn: 'reviews_count', confidence: 'high' })
  })

  it('maps Lazada product export headers', () => {
    const headers = [
      'url', 'title', 'rating', 'reviews', 'initial_price', 'final_price', 'currency', 'image',
      'seller_name', 'breadcrumb', 'product_specifications', 'product_description', 'sku', 'mpn',
      'colors', 'brand', 'domain',
    ]
    const mappings = mapColumns(headers, 'products')
    expect(mappingFor(mappings, 'sku')).toMatchObject({ sourceColumn: 'sku', confidence: 'high' })
    expect(mappingFor(mappings, 'productName')).toMatchObject({ sourceColumn: 'title', confidence: 'high' })
    expect(mappingFor(mappings, 'currentPrice')).toMatchObject({ sourceColumn: 'final_price', confidence: 'high' })
    expect(mappingFor(mappings, 'originalPrice')).toMatchObject({ sourceColumn: 'initial_price', confidence: 'high' })
    expect(mappingFor(mappings, 'ratingCount')).toMatchObject({ sourceColumn: 'reviews', confidence: 'high' })
    expect(mappingFor(mappings, 'category')).toMatchObject({ sourceColumn: 'breadcrumb', confidence: 'high' })
  })

  it('maps the newer Amazon scraper export headers (asin-based)', () => {
    const headers = [
      'timestamp', 'title', 'seller_name', 'brand', 'description', 'initial_price', 'final_price',
      'currency', 'availability', 'reviews_count', 'categories', 'asin', 'buybox_seller', 'domain',
      'url', 'image_url', 'rating', 'discount', 'manufacturer', 'upc',
    ]
    const mappings = mapColumns(headers, 'products')
    expect(mappingFor(mappings, 'sku')).toMatchObject({ sourceColumn: 'asin', confidence: 'high' })
    expect(mappingFor(mappings, 'productName')).toMatchObject({ sourceColumn: 'title', confidence: 'high' })
    expect(mappingFor(mappings, 'currentPrice')).toMatchObject({ sourceColumn: 'final_price', confidence: 'high' })
    expect(mappingFor(mappings, 'originalPrice')).toMatchObject({ sourceColumn: 'initial_price', confidence: 'high' })
    expect(mappingFor(mappings, 'ratingCount')).toMatchObject({ sourceColumn: 'reviews_count', confidence: 'high' })
  })

  it('supports multiple warehouse inventory headers', () => {
    const headers = ['SKU', 'Warehouse', 'Available Quantity', 'Reserved Quantity', 'Reorder Point']
    const mappings = mapColumns(headers, 'inventory')
    expect(mappingFor(mappings, 'sku')).toMatchObject({ sourceColumn: 'SKU', confidence: 'high' })
    expect(mappingFor(mappings, 'warehouse')).toMatchObject({ sourceColumn: 'Warehouse', confidence: 'high' })
    expect(mappingFor(mappings, 'availableInventory')).toMatchObject({
      sourceColumn: 'Available Quantity',
      confidence: 'high',
    })
    expect(mappingFor(mappings, 'reservedInventory')).toMatchObject({
      sourceColumn: 'Reserved Quantity',
      confidence: 'high',
    })
    expect(mappingFor(mappings, 'reorderLevel')).toMatchObject({ sourceColumn: 'Reorder Point', confidence: 'high' })
  })
})
