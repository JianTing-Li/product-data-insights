// One-off script that derives Product Pounce's bundled sample data from real
// product exports. Not part of the app build/runtime — run manually with
// `node scripts/generate-sample-data.mjs` whenever the sample data needs to
// be regenerated. Requires the source files locally; none are committed to
// the repo.
//
// For each company, produces:
//   public/sample-data/{company}-products.csv   — ~14 curated real rows, verbatim
//   public/sample-data/{company}-sales.csv      — illustrative, keyed to the real product IDs above
//   public/sample-data/{company}-inventory.csv  — illustrative, keyed to the real product IDs above

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Papa from 'papaparse'

const OUT_DIR = fileURLToPath(new URL('../public/sample-data/', import.meta.url))
mkdirSync(OUT_DIR, { recursive: true })

const DATASET_DIR = '/Users/jt/Downloads/eCommerce-dataset-samples-main'

const COMPANIES = [
  {
    key: 'amazon',
    sourcePath: '/Users/jt/Downloads/amazon.csv',
    idCol: 'product_id',
    nameCol: 'product_name',
    priceCol: 'discounted_price',
    ratingCol: 'rating',
    ratingCountCol: 'rating_count',
    categoryCol: 'category',
    // Amazon's category is pipe-delimited ("Electronics|Wearables|..."); group
    // by the top-level segment only, matching the original curated selection
    // this app's tests were written against.
    categoryKeyFn: (row) => (row.category || '').split('|')[0] || 'Uncategorized',
    currencyCol: null,
    defaultCurrency: 'INR',
    // Hand-picked (not auto-derived) so this exact set stays stable across regenerations.
    mustInclude: ['B0BBVKRP7B', 'B0B53DS4TF', 'B07JW9H4J1', 'B098NS6PVG'],
  },
  {
    key: 'walmart',
    sourcePath: `${DATASET_DIR}/walmart-products.csv`,
    idCol: 'sku',
    nameCol: 'product_name',
    priceCol: 'final_price',
    ratingCol: 'rating',
    ratingCountCol: 'review_count',
    categoryCol: 'category_name',
    currencyCol: 'currency',
    defaultCurrency: 'USD',
  },
  {
    key: 'shopee',
    sourcePath: `${DATASET_DIR}/shopee-products.csv`,
    idCol: 'id',
    nameCol: 'title',
    priceCol: 'final_price',
    ratingCol: 'rating',
    ratingCountCol: 'reviews',
    categoryCol: 'breadcrumb',
    currencyCol: 'currency',
    defaultCurrency: 'USD',
  },
  {
    key: 'shein',
    sourcePath: `${DATASET_DIR}/shein-products.csv`,
    idCol: 'product_id',
    nameCol: 'product_name',
    priceCol: 'final_price',
    ratingCol: 'rating',
    ratingCountCol: 'reviews_count',
    categoryCol: 'category',
    currencyCol: 'currency',
    defaultCurrency: 'USD',
  },
  {
    key: 'lazada',
    sourcePath: `${DATASET_DIR}/lazada-products.csv`,
    idCol: 'sku',
    nameCol: 'title',
    priceCol: 'final_price',
    ratingCol: 'rating',
    ratingCountCol: 'reviews',
    categoryCol: 'breadcrumb',
    currencyCol: 'currency',
    defaultCurrency: 'USD',
  },
]

function csvEscape(value) {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}
function toRow(values) {
  return values.map(csvEscape).join(',')
}
function writeCsv(filename, headerOrder, rows) {
  const lines = [toRow(headerOrder), ...rows.map((r) => toRow(headerOrder.map((h) => r[h] ?? '')))]
  writeFileSync(OUT_DIR + filename, lines.join('\n') + '\n')
  console.log(`wrote ${filename}: ${rows.length} rows`)
}

function parseLoose(value) {
  if (!value) return NaN
  return parseFloat(String(value).replace(/[₹$,]/g, ''))
}

/** Scales a price string by a factor while preserving any leading currency
 * symbol, so a synthetic "conflicting" price still looks like it came from
 * the same export as the original (e.g. "₹281" -> "₹196.70"). */
function scalePriceString(raw, factor) {
  const match = String(raw).match(/^(\D*)([\d.,eE+-]+)/)
  const prefix = match ? match[1] : ''
  const numeric = parseLoose(raw) * factor
  return `${prefix}${numeric.toFixed(2)}`
}

function stratifiedSample(pool, targetCount, mustIncludeRows, categoryKeyFn) {
  const chosen = []
  const chosenIds = new Set()
  const idOf = (r) => r.__id
  for (const row of mustIncludeRows) {
    if (row && !chosenIds.has(idOf(row))) {
      chosen.push(row)
      chosenIds.add(idOf(row))
    }
  }
  const byCategory = new Map()
  for (const r of pool) {
    const cat = categoryKeyFn(r)
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
      while (i < list.length && chosenIds.has(idOf(list[i]))) i++
      if (i < list.length) {
        chosen.push(list[i])
        chosenIds.add(idOf(list[i]))
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

/** Data-driven curated-set anchors for companies without a hand-picked list:
 * the lowest- and highest-rated rows (reputation-concern / promising-
 * reputation candidates) and the two highest-rating-count rows (popular
 * baselines). Generalizes what was done manually for the Amazon set. */
function pickAutoAnchors(cleanRows, cfg) {
  const withRating = cleanRows.filter((r) => parseLoose(r[cfg.ratingCol]) > 0)
  const byRatingAsc = [...withRating].sort((a, b) => parseLoose(a[cfg.ratingCol]) - parseLoose(b[cfg.ratingCol]))
  const byRatingCountDesc = [...cleanRows].sort(
    (a, b) => (parseLoose(b[cfg.ratingCountCol]) || 0) - (parseLoose(a[cfg.ratingCountCol]) || 0),
  )
  const anchors = []
  if (byRatingAsc.length > 0) anchors.push(byRatingAsc[0])
  if (byRatingAsc.length > 1) anchors.push(byRatingAsc[byRatingAsc.length - 1])
  if (byRatingCountDesc.length > 0) anchors.push(byRatingCountDesc[0])
  if (byRatingCountDesc.length > 1) anchors.push(byRatingCountDesc[1])
  const seen = new Set()
  return anchors.filter((r) => {
    if (seen.has(r.__id)) return false
    seen.add(r.__id)
    return true
  })
}

let seed = 7
function rand() {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

const SALES_HEADERS = ['order_id', 'order_date', 'sku', 'quantity', 'selling_price', 'currency', 'order_status', 'discount']
const INVENTORY_HEADERS = ['sku', 'warehouse', 'available_inventory', 'reserved_inventory', 'incoming_inventory', 'reorder_level']
const STATUSES = ['Completed', 'Completed', 'Completed', 'Shipped', 'Completed']

function generateCompany(cfg) {
  console.log(`\n=== ${cfg.key} ===`)
  const sourceText = readFileSync(cfg.sourcePath, 'utf8')
  const parsed = Papa.parse(sourceText, { header: true, skipEmptyLines: 'greedy' })
  if (parsed.errors.length > 0) {
    console.error(`Unexpected parse errors in ${cfg.sourcePath}:`, parsed.errors.slice(0, 5))
    process.exit(1)
  }
  const headers = parsed.meta.fields
  const rows = parsed.data.map((r) => ({ ...r, __id: r[cfg.idCol] }))
  const byId = new Map(rows.map((r) => [r.__id, r]))

  const cleanRows = rows.filter((r) => {
    const price = parseLoose(r[cfg.priceCol])
    return r.__id && r[cfg.nameCol] && !Number.isNaN(price) && price > 0
  })

  const mustIncludeRows = (cfg.mustInclude ?? []).map((id) => byId.get(id)).filter(Boolean)
  const anchors = mustIncludeRows.length > 0 ? mustIncludeRows : pickAutoAnchors(cleanRows, cfg)
  const categoryKeyFn = cfg.categoryKeyFn ?? ((row) => (row[cfg.categoryCol] || 'Uncategorized').slice(0, 60))
  const curated = stratifiedSample(cleanRows, 14, anchors, categoryKeyFn)

  // Deliberate data-quality fixture: a conflicting duplicate product record —
  // the same real product ID reappearing with a different price/rating.
  const conflictSource = curated[0]
  const conflictRow = { ...conflictSource, [cfg.priceCol]: scalePriceString(conflictSource[cfg.priceCol], 0.7), [cfg.ratingCol]: '1' }
  writeCsv(`${cfg.key}-products.csv`, headers, [...curated, conflictRow])

  // ---- illustrative inventory: multiple warehouses per product, one product deliberately missing ----
  const products = curated.map((r) => ({
    sku: r.__id,
    name: r[cfg.nameCol],
    price: r[cfg.priceCol],
    currency: (cfg.currencyCol && r[cfg.currencyCol]) || cfg.defaultCurrency,
  }))

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
  writeCsv(`${cfg.key}-inventory.csv`, INVENTORY_HEADERS, inventoryRows)

  // ---- illustrative sales: 14 days of orders, current 7d vs previous 7d ----
  const salesRows = []
  let orderNum = 10000
  const startDate = new Date('2026-07-15T00:00:00Z')
  const dateStr = (d) => d.toISOString().slice(0, 10)

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
        const status = STATUSES[Math.floor(rand() * STATUSES.length)]
        const discount = rand() > 0.85 ? '10%' : ''
        salesRows.push({ order_id: orderId, order_date: dateStr(date), sku: p.sku, quantity: qty, selling_price: p.price, currency: p.currency, order_status: status, discount })
      }
    }
  }

  // Deliberate data-quality fixtures (clearly synthetic edge cases, not claims about any product):
  salesRows.push({ order_id: 'ORD-99001', order_date: '2026-07-27', sku: `${cfg.key.toUpperCase()}-UNKNOWN-999`, quantity: 2, selling_price: '9.99', currency: products[0].currency, order_status: 'Completed', discount: '' })
  salesRows.push(salesRows[0]) // exact duplicate row
  salesRows.push({ order_id: 'ORD-99002', order_date: '2026-07-27', sku: products[0].sku, quantity: 'N/A', selling_price: products[0].price, currency: products[0].currency, order_status: 'Completed', discount: '' })
  salesRows.push({ order_id: 'ORD-99003', order_date: '2026-07-27', sku: products[2].sku, quantity: 1, selling_price: 'contact us', currency: products[2].currency, order_status: 'Completed', discount: '' })
  salesRows.push({ order_id: 'ORD-99004', order_date: 'not-a-date', sku: products[3].sku, quantity: 1, selling_price: products[3].price, currency: products[3].currency, order_status: 'Completed', discount: '' })

  writeCsv(`${cfg.key}-sales.csv`, SALES_HEADERS, salesRows)
  console.log(`${cfg.key} product IDs used:`, products.map((p) => p.sku).join(', '))
}

for (const cfg of COMPANIES) {
  generateCompany(cfg)
}
