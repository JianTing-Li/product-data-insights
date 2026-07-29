/** Normalizes a header or alias string into a comparable key: lowercase,
 * alphanumeric only, no separators. "Order ID", "order_id", "OrderID" all
 * normalize to "orderid". */
export function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}
