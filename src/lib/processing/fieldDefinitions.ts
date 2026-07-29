import type { DatasetKind, FieldDefinition } from './types'

export const SALES_FIELDS: FieldDefinition[] = [
  { field: 'orderId', label: 'Order ID', required: true, valueType: 'text' },
  { field: 'orderDate', label: 'Order date', required: true, valueType: 'date' },
  { field: 'sku', label: 'Product ID or SKU', required: true, valueType: 'text' },
  { field: 'quantity', label: 'Quantity', required: true, valueType: 'integer' },
  { field: 'sellingPrice', label: 'Selling price', required: true, valueType: 'currency' },
  { field: 'productCost', label: 'Product cost', required: false, valueType: 'currency' },
  { field: 'orderStatus', label: 'Order status', required: false, valueType: 'text' },
  { field: 'discount', label: 'Discount', required: false, valueType: 'percent' },
  { field: 'currency', label: 'Currency', required: false, valueType: 'text' },
]

export const PRODUCT_FIELDS: FieldDefinition[] = [
  { field: 'sku', label: 'Product ID or SKU', required: true, valueType: 'text' },
  { field: 'productName', label: 'Product name', required: true, valueType: 'text' },
  { field: 'category', label: 'Category', required: false, valueType: 'text' },
  { field: 'brand', label: 'Brand', required: false, valueType: 'text' },
  { field: 'currentPrice', label: 'Current price', required: false, valueType: 'currency' },
  { field: 'originalPrice', label: 'Original price', required: false, valueType: 'currency' },
  { field: 'productCost', label: 'Product cost', required: false, valueType: 'currency' },
  { field: 'rating', label: 'Rating', required: false, valueType: 'number' },
  { field: 'ratingCount', label: 'Rating count', required: false, valueType: 'integer' },
  { field: 'description', label: 'Description', required: false, valueType: 'text' },
  { field: 'reviewText', label: 'Review text', required: false, valueType: 'text' },
  { field: 'productUrl', label: 'Product URL', required: false, valueType: 'text' },
  { field: 'imageUrl', label: 'Image URL', required: false, valueType: 'text' },
]

export const INVENTORY_FIELDS: FieldDefinition[] = [
  { field: 'sku', label: 'Product ID or SKU', required: true, valueType: 'text' },
  { field: 'availableInventory', label: 'Available inventory', required: true, valueType: 'integer' },
  { field: 'reservedInventory', label: 'Reserved inventory', required: false, valueType: 'integer' },
  { field: 'warehouse', label: 'Warehouse', required: false, valueType: 'text' },
  { field: 'incomingInventory', label: 'Incoming inventory', required: false, valueType: 'integer' },
  { field: 'reorderLevel', label: 'Reorder level', required: false, valueType: 'integer' },
]

export const FIELD_DEFINITIONS_BY_KIND: Record<DatasetKind, FieldDefinition[]> = {
  sales: SALES_FIELDS,
  products: PRODUCT_FIELDS,
  inventory: INVENTORY_FIELDS,
}

export const DATASET_LABELS: Record<DatasetKind, string> = {
  sales: 'Sales',
  products: 'Products',
  inventory: 'Inventory',
}
