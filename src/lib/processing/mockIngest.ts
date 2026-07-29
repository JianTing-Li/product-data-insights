import type { AddedFile, DatasetKind } from './types'

// Placeholder used only for the Phase 1 UI shell so dropped files render with
// a filename, size, and row count. Replaced in Phase 2 by the real CSV
// parsing + dataset-detection pipeline.

function guessKindFromFilename(filename: string): DatasetKind {
  const lower = filename.toLowerCase()
  if (lower.includes('sale') || lower.includes('order')) return 'sales'
  if (lower.includes('invent') || lower.includes('stock') || lower.includes('warehouse')) return 'inventory'
  return 'products'
}

export async function mockIngestFile(file: File): Promise<AddedFile> {
  const text = await file.text()
  const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0)
  const headers = lines[0]?.split(',').map((h) => h.trim()) ?? []
  const previewRows = lines.slice(1, 6).map((line) => {
    const cells = line.split(',')
    return Object.fromEntries(headers.map((h, i) => [h, cells[i]?.trim() ?? '']))
  })
  return {
    id: crypto.randomUUID(),
    filename: file.name,
    source: 'upload',
    sizeBytes: file.size,
    status: 'parsed',
    datasetKind: guessKindFromFilename(file.name),
    detectionConfidence: 'medium',
    headers,
    rowCount: Math.max(lines.length - 1, 0),
    rows: previewRows,
  }
}

export const mockSampleFiles: AddedFile[] = [
  {
    id: 'sample-sales',
    filename: 'sample-sales.csv',
    source: 'sample',
    sizeBytes: 48213,
    status: 'parsed',
    datasetKind: 'sales',
    detectionConfidence: 'high',
    headers: ['order_id', 'order_date', 'sku', 'quantity', 'selling_price', 'product_cost'],
    rowCount: 842,
    rows: [
      { order_id: 'ORD-10021', order_date: '2026-07-24', sku: 'SKU-10234', quantity: '2', selling_price: '12.99', product_cost: '6.20' },
      { order_id: 'ORD-10022', order_date: '2026-07-24', sku: 'SKU-77231', quantity: '1', selling_price: '15.99', product_cost: '9.90' },
      { order_id: 'ORD-10023', order_date: '2026-07-25', sku: 'SKU-90021', quantity: '3', selling_price: '22.50', product_cost: '11.00' },
    ],
  },
  {
    id: 'sample-products',
    filename: 'sample-products.csv',
    source: 'sample',
    sizeBytes: 91024,
    status: 'parsed',
    datasetKind: 'products',
    detectionConfidence: 'high',
    headers: ['product_id', 'product_name', 'category', 'brand', 'current_price', 'rating', 'rating_count'],
    rowCount: 312,
    rows: [
      { product_id: 'SKU-10234', product_name: 'Braided USB-C Fast Charging Cable, 6ft (2-Pack)', category: 'Electronics > Cables & Accessories', brand: 'Wayona', current_price: '12.99', rating: '4.2', rating_count: '24269' },
      { product_id: 'SKU-77231', product_name: 'Compact Wireless Mouse, Ergonomic Design', category: 'Electronics > Computer Accessories', brand: 'Logitech', current_price: '15.99', rating: '4.5', rating_count: '8123' },
    ],
  },
  {
    id: 'sample-inventory',
    filename: 'sample-inventory.csv',
    source: 'sample',
    sizeBytes: 15021,
    status: 'parsed',
    datasetKind: 'inventory',
    detectionConfidence: 'high',
    headers: ['sku', 'warehouse', 'available_inventory', 'reserved_inventory'],
    rowCount: 486,
    rows: [
      { sku: 'SKU-10234', warehouse: 'WH-EAST', available_inventory: '150', reserved_inventory: '10' },
      { sku: 'SKU-10234', warehouse: 'WH-WEST', available_inventory: '60', reserved_inventory: '4' },
      { sku: 'SKU-55810', warehouse: 'WH-EAST', available_inventory: '0', reserved_inventory: '0' },
    ],
  },
]
