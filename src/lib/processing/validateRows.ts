import { detectDateFormat, parseDate } from './dateParsers'
import { normalizeMissing } from './normalizeMissing'
import { parseCurrency, parseNonNegativeInteger, parseNumber, parsePercent, parseQuantity } from './valueParsers'
import type {
  ColumnMapping,
  FieldName,
  InventoryRecord,
  ProcessedRow,
  ProductRecord,
  RawRow,
  RowIssue,
  SalesRecord,
} from './types'

function getMappedRaw(raw: RawRow, mappings: ColumnMapping[], field: FieldName): string | undefined {
  const mapping = mappings.find((m) => m.field === field)
  if (!mapping || !mapping.sourceColumn) return undefined
  return raw[mapping.sourceColumn]
}

/** Extracts a field as plain preserved text (no numeric/date parsing) —
 * used for IDs so leading zeroes and hyphens are never touched. */
function getMappedText(raw: RawRow, mappings: ColumnMapping[], field: FieldName): string | null {
  return normalizeMissing(getMappedRaw(raw, mappings, field))
}

export function validateSalesRows(rows: RawRow[], mappings: ColumnMapping[], fileId: string): ProcessedRow<SalesRecord>[] {
  const dateColumn = mappings.find((m) => m.field === 'orderDate')?.sourceColumn
  const dateSample = dateColumn ? rows.map((r) => r[dateColumn]) : []
  const dateDetection = detectDateFormat(dateSample)

  return rows.map((raw, rowIndex) => {
    const issues: RowIssue[] = []
    let requiredFailed = false

    const orderId = getMappedText(raw, mappings, 'orderId')
    if (orderId === null) {
      issues.push({ field: 'orderId', message: 'Order ID is missing.' })
      requiredFailed = true
    }

    const sku = getMappedText(raw, mappings, 'sku')
    if (sku === null) {
      issues.push({ field: 'sku', message: 'Product ID or SKU is missing.' })
      requiredFailed = true
    }

    const orderDateRaw = getMappedRaw(raw, mappings, 'orderDate')
    const orderDate = parseDate(orderDateRaw, dateDetection.format)
    if (normalizeMissing(orderDateRaw) === null) {
      issues.push({ field: 'orderDate', message: 'Order date is missing.' })
      requiredFailed = true
    } else if (orderDate === null) {
      issues.push({ field: 'orderDate', message: `"${orderDateRaw}" could not be parsed as a date.` })
      requiredFailed = true
    } else if (dateDetection.ambiguous) {
      issues.push({
        field: 'orderDate',
        message: 'Date format is ambiguous (day vs. month order unclear from the data) — assumed month/day/year. Confirm the format if this looks wrong.',
      })
    }

    const quantityResult = parseQuantity(getMappedRaw(raw, mappings, 'quantity'))
    if (quantityResult.issue || quantityResult.value === null) {
      issues.push({ field: 'quantity', message: quantityResult.issue ?? 'Quantity is missing.' })
      requiredFailed = true
    }

    const sellingPriceResult = parseCurrency(getMappedRaw(raw, mappings, 'sellingPrice'))
    if (sellingPriceResult.issue || sellingPriceResult.value === null) {
      issues.push({ field: 'sellingPrice', message: sellingPriceResult.issue ?? 'Selling price is missing.' })
      requiredFailed = true
    }

    const productCostResult = parseCurrency(getMappedRaw(raw, mappings, 'productCost'))
    if (productCostResult.issue) issues.push({ field: 'productCost', message: productCostResult.issue })

    const discountResult = parsePercent(getMappedRaw(raw, mappings, 'discount'))
    if (discountResult.issue) issues.push({ field: 'discount', message: discountResult.issue })

    const orderStatus = getMappedText(raw, mappings, 'orderStatus') ?? undefined
    const currency = getMappedText(raw, mappings, 'currency') ?? undefined

    if (requiredFailed) {
      return { rowIndex, fileId, acceptance: 'rejected', issues, raw, value: null }
    }

    const value: SalesRecord = {
      orderId: orderId!,
      orderDate,
      sku: sku!,
      quantity: quantityResult.value!,
      sellingPrice: sellingPriceResult.value!,
      productCost: productCostResult.value ?? undefined,
      orderStatus,
      discount: discountResult.value ?? undefined,
      currency,
    }

    return { rowIndex, fileId, acceptance: issues.length > 0 ? 'warning' : 'accepted', issues, raw, value }
  })
}

export function validateProductRows(rows: RawRow[], mappings: ColumnMapping[], fileId: string): ProcessedRow<ProductRecord>[] {
  return rows.map((raw, rowIndex) => {
    const issues: RowIssue[] = []
    let requiredFailed = false

    const sku = getMappedText(raw, mappings, 'sku')
    if (sku === null) {
      issues.push({ field: 'sku', message: 'Product ID or SKU is missing.' })
      requiredFailed = true
    }

    const productName = getMappedText(raw, mappings, 'productName')
    if (productName === null) {
      issues.push({ field: 'productName', message: 'Product name is missing.' })
      requiredFailed = true
    }

    const currentPriceResult = parseCurrency(getMappedRaw(raw, mappings, 'currentPrice'))
    if (currentPriceResult.issue) issues.push({ field: 'currentPrice', message: currentPriceResult.issue })
    const originalPriceResult = parseCurrency(getMappedRaw(raw, mappings, 'originalPrice'))
    if (originalPriceResult.issue) issues.push({ field: 'originalPrice', message: originalPriceResult.issue })
    const productCostResult = parseCurrency(getMappedRaw(raw, mappings, 'productCost'))
    if (productCostResult.issue) issues.push({ field: 'productCost', message: productCostResult.issue })
    const ratingResult = parseNumber(getMappedRaw(raw, mappings, 'rating'))
    if (ratingResult.issue) issues.push({ field: 'rating', message: ratingResult.issue })
    const ratingCountResult = parseNonNegativeInteger(getMappedRaw(raw, mappings, 'ratingCount'))
    if (ratingCountResult.issue) issues.push({ field: 'ratingCount', message: ratingCountResult.issue })

    if (requiredFailed) {
      return { rowIndex, fileId, acceptance: 'rejected', issues, raw, value: null }
    }

    const value: ProductRecord = {
      sku: sku!,
      productName: productName!,
      category: getMappedText(raw, mappings, 'category') ?? undefined,
      brand: getMappedText(raw, mappings, 'brand') ?? undefined,
      currentPrice: currentPriceResult.value ?? undefined,
      originalPrice: originalPriceResult.value ?? undefined,
      productCost: productCostResult.value ?? undefined,
      rating: ratingResult.value ?? undefined,
      ratingCount: ratingCountResult.value ?? undefined,
      description: getMappedText(raw, mappings, 'description') ?? undefined,
      reviewText: getMappedText(raw, mappings, 'reviewText') ?? undefined,
      productUrl: getMappedText(raw, mappings, 'productUrl') ?? undefined,
      imageUrl: getMappedText(raw, mappings, 'imageUrl') ?? undefined,
      currency: getMappedText(raw, mappings, 'currency') ?? undefined,
    }

    return { rowIndex, fileId, acceptance: issues.length > 0 ? 'warning' : 'accepted', issues, raw, value }
  })
}

export function validateInventoryRows(rows: RawRow[], mappings: ColumnMapping[], fileId: string): ProcessedRow<InventoryRecord>[] {
  return rows.map((raw, rowIndex) => {
    const issues: RowIssue[] = []
    let requiredFailed = false

    const sku = getMappedText(raw, mappings, 'sku')
    if (sku === null) {
      issues.push({ field: 'sku', message: 'Product ID or SKU is missing.' })
      requiredFailed = true
    }

    const availableResult = parseNonNegativeInteger(getMappedRaw(raw, mappings, 'availableInventory'))
    if (availableResult.issue || availableResult.value === null) {
      issues.push({ field: 'availableInventory', message: availableResult.issue ?? 'Available inventory is missing.' })
      requiredFailed = true
    }

    const reservedResult = parseNonNegativeInteger(getMappedRaw(raw, mappings, 'reservedInventory'))
    if (reservedResult.issue) issues.push({ field: 'reservedInventory', message: reservedResult.issue })
    const incomingResult = parseNonNegativeInteger(getMappedRaw(raw, mappings, 'incomingInventory'))
    if (incomingResult.issue) issues.push({ field: 'incomingInventory', message: incomingResult.issue })
    const reorderResult = parseNonNegativeInteger(getMappedRaw(raw, mappings, 'reorderLevel'))
    if (reorderResult.issue) issues.push({ field: 'reorderLevel', message: reorderResult.issue })

    if (requiredFailed) {
      return { rowIndex, fileId, acceptance: 'rejected', issues, raw, value: null }
    }

    const value: InventoryRecord = {
      sku: sku!,
      availableInventory: availableResult.value!,
      reservedInventory: reservedResult.value ?? undefined,
      warehouse: getMappedText(raw, mappings, 'warehouse') ?? undefined,
      incomingInventory: incomingResult.value ?? undefined,
      reorderLevel: reorderResult.value ?? undefined,
    }

    return { rowIndex, fileId, acceptance: issues.length > 0 ? 'warning' : 'accepted', issues, raw, value }
  })
}
