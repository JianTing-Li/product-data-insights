// One-off script that derives Product Pounce's bundled sample data from a
// real Amazon product export. Not part of the app build/runtime — run
// manually with `node scripts/generate-sample-data.mjs` whenever the sample
// data needs to be regenerated. Requires the source file locally; it is not
// committed to the repo.
//
// Produces:
//   public/sample-data/catalog-only-products.csv  — ~50 real rows, verbatim
//   public/sample-data/full-products.csv          — ~14 real rows, verbatim
//   public/sample-data/full-sales.csv             — illustrative, keyed to the real product IDs above
//   public/sample-data/full-inventory.csv         — illustrative, keyed to the real product IDs above

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Papa from 'papaparse'

const SOURCE_PATH = '/Users/jt/Downloads/amazon.csv'
const OUT_DIR = fileURLToPath(new URL('../public/sample-data/', import.meta.url))
mkdirSync(OUT_DIR, { recursive: true })

const sourceText = readFileSync(SOURCE_PATH, 'utf8')
const parsed = Papa.parse(sourceText, { header: true, skipEmptyLines: 'greedy' })
if (parsed.errors.length > 0) {
  console.error('Unexpected parse errors in source file:', parsed.errors.slice(0, 5))
  process.exit(1)
}
const headers = parsed.meta.fields
const rows = parsed.data
const byId = new Map(rows.map((r) => [r.product_id, r]))

function topCategory(row) {
  return (row.category || '').split('|')[0] || 'Uncategorized'
}

function writeCsv(filename, rowsToWrite, headerOrder = headers) {
  const csv = Papa.unparse({ fields: headerOrder, data: rowsToWrite.map((r) => headerOrder.map((h) => r[h] ?? '')) })
  writeFileSync(OUT_DIR + filename, csv + '\n')
  console.log(`wrote ${filename}: ${rowsToWrite.length} rows`)
}

// ---- catalog-only sample: ~50 real rows, verbatim, spread across categories ----
// Deliberately include one row with a naturally malformed rating field
// ("|" — present in the real source file) so the Data Quality tab has a
// genuine example to surface, without us inventing any fake defects.
const CATALOG_MUST_INCLUDE = ['B08L12N5H1']

function stratifiedSample(pool, targetCount, mustIncludeIds) {
  const chosen = []
  const chosenIds = new Set()
  for (const id of mustIncludeIds) {
    const row = byId.get(id)
    if (row && !chosenIds.has(id)) {
      chosen.push(row)
      chosenIds.add(id)
    }
  }
  const byCategory = new Map()
  for (const r of pool) {
    const cat = topCategory(r)
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat).push(r)
  }
  const categories = [...byCategory.keys()]
  const cursor = new Map(categories.map((c) => [c, 0]))
  while (chosen.length < targetCount) {
    let addedAny = false
    for (const cat of categories) {
      if (chosen.length >= targetCount) break
      const list = byCategory.get(cat)
      let i = cursor.get(cat)
      while (i < list.length && chosenIds.has(list[i].product_id)) i++
      if (i < list.length) {
        chosen.push(list[i])
        chosenIds.add(list[i].product_id)
        cursor.set(cat, i + 1)
        addedAny = true
      } else {
        cursor.set(cat, i)
      }
    }
    if (!addedAny) break
  }
  return chosen
}

const catalogRows = stratifiedSample(rows, 50, CATALOG_MUST_INCLUDE)
writeCsv('catalog-only-products.csv', catalogRows)

// ---- full-analysis sample: ~14 real rows, verbatim, curated for signal variety ----
function parsePrice(value) {
  if (!value) return NaN
  return parseFloat(value.replace(/[₹,]/g, ''))
}
function cleanRow(row) {
  const rating = parseFloat(row.rating)
  const dp = parsePrice(row.discounted_price)
  const ap = parsePrice(row.actual_price)
  return !Number.isNaN(rating) && !Number.isNaN(dp) && !Number.isNaN(ap)
}

const FULL_MUST_INCLUDE = [
  'B0BBVKRP7B', // rating 2.8 — reputation-concern candidate
  'B0B53DS4TF', // rating 4.8, 3,964 ratings — promising-reputation candidate
  'B07JW9H4J1', // Wayona cable — high-volume popular baseline (24,269 ratings)
  'B098NS6PVG', // Ambrane cable — high-volume popular baseline (43,994 ratings)
]
const cleanPool = rows.filter(cleanRow)
const fullRows = stratifiedSample(cleanPool, 14, FULL_MUST_INCLUDE)

// Deliberate data-quality fixture: a conflicting duplicate product record —
// the same real product ID reappearing with a different price/rating, as if
// two exports of the catalog disagreed. Still real values (both the
// original row and this variant's price/rating are plausible), just
// deliberately inconsistent with each other.
const conflictSource = fullRows[0]
const conflictRow = {
  ...conflictSource,
  discounted_price: '₹299',
  rating: '3.2',
}
writeCsv('full-products.csv', [...fullRows, conflictRow])

// ---- full-analysis illustrative sales + inventory, keyed to the real product IDs above ----
let seed = 7
function rand() {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

const salesHeaders = ['order_id', 'order_date', 'sku', 'quantity', 'selling_price', 'currency', 'order_status', 'discount']
const inventoryHeaders = ['sku', 'warehouse', 'available_inventory', 'reserved_inventory', 'incoming_inventory', 'reorder_level']
const statuses = ['Completed', 'Completed', 'Completed', 'Shipped', 'Completed']

const products = fullRows.map((r) => ({
  sku: r.product_id,
  name: r.product_name,
  price: r.discounted_price, // reuse the real ₹-formatted value verbatim, no invented pricing
}))

// ---- inventory: multiple warehouse rows per product; one product deliberately missing (data-quality fixture) ----
// Indices 0-3 are the curated rating/volume picks (FULL_MUST_INCLUDE) — inventory-driven
// signals are placed on later, less-curated indices so they don't collide with those roles.
const inventoryRows = []
products.forEach((p, i) => {
  if (i === 6) return // deliberately missing inventory record
  const isOutOfStock = i === 7
  const isLow = i === 8
  const isSlow = i === 9
  const eastAvailable = isOutOfStock ? 0 : isLow ? 14 : isSlow ? 55 : Math.round(60 + rand() * 120)
  const westAvailable = isOutOfStock ? 0 : isLow ? 9 : isSlow ? 25 : Math.round(30 + rand() * 90)
  inventoryRows.push({ sku: p.sku, warehouse: 'WH-EAST', available_inventory: eastAvailable, reserved_inventory: Math.round(rand() * 10), incoming_inventory: Math.round(rand() * 40), reorder_level: 20 })
  inventoryRows.push({ sku: p.sku, warehouse: 'WH-WEST', available_inventory: westAvailable, reserved_inventory: Math.round(rand() * 6), incoming_inventory: Math.round(rand() * 20), reorder_level: 15 })
})
writeCsv('full-inventory.csv', inventoryRows, inventoryHeaders)

// ---- sales: 14 days of orders, current 7d vs previous 7d ----
const salesRows = []
let orderNum = 10000
const startDate = new Date('2026-07-15T00:00:00Z')
function dateStr(d) {
  return d.toISOString().slice(0, 10)
}

for (let day = 0; day < 14; day++) {
  const date = new Date(startDate)
  date.setUTCDate(date.getUTCDate() + day)
  const isCurrentPeriod = day >= 7
  const ordersToday = 8 + Math.floor(rand() * 6)

  for (let o = 0; o < ordersToday; o++) {
    orderNum++
    const orderId = `ORD-${orderNum}`
    const lineCount = 1 + Math.floor(rand() * 3)
    const chosen = new Set()
    for (let li = 0; li < lineCount; li++) {
      let idx = Math.floor(rand() * products.length)
      if (idx === 7 && isCurrentPeriod) idx = 0 // out-of-stock product stops selling in the current period
      if (chosen.has(idx)) continue
      chosen.add(idx)
      const p = products[idx]
      let qty = 1 + Math.floor(rand() * 4)
      if (idx === 2 && isCurrentPeriod) qty += 3 // fast-growing product
      if (idx === 9) qty = rand() > 0.8 ? 1 : 0 // slow-moving product rarely sells
      if (qty === 0) continue
      const status = statuses[Math.floor(rand() * statuses.length)]
      const discount = rand() > 0.85 ? '10%' : ''
      salesRows.push({ order_id: orderId, order_date: dateStr(date), sku: p.sku, quantity: qty, selling_price: p.price, currency: 'INR', order_status: status, discount })
    }
  }
}

// Deliberate data-quality fixtures (clearly synthetic edge cases, not claims about any product):
salesRows.push({ order_id: 'ORD-99001', order_date: '2026-07-27', sku: 'B000UNKNOWN99', quantity: 2, selling_price: '₹499', currency: 'INR', order_status: 'Completed', discount: '' }) // unmatched product ID
salesRows.push(salesRows[0]) // exact duplicate row
salesRows.push({ order_id: 'ORD-99002', order_date: '2026-07-27', sku: products[0].sku, quantity: 'N/A', selling_price: products[0].price, currency: 'INR', order_status: 'Completed', discount: '' }) // invalid quantity
salesRows.push({ order_id: 'ORD-99003', order_date: '2026-07-27', sku: products[2].sku, quantity: 1, selling_price: 'contact us', currency: 'INR', order_status: 'Completed', discount: '' }) // unparseable price
salesRows.push({ order_id: 'ORD-99004', order_date: 'not-a-date', sku: products[3].sku, quantity: 1, selling_price: products[3].price, currency: 'INR', order_status: 'Completed', discount: '' }) // invalid date

writeCsv('full-sales.csv', salesRows, salesHeaders)

console.log('\nFull-analysis product IDs used:', products.map((p) => p.sku).join(', '))
