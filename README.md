**Product Pounce is a browser-based product intelligence dashboard for e-commerce teams turning product, sales, and inventory CSVs into prioritized actions.**

## Screenshot

> Product screenshot or GIF coming soon.

## Problem

E-commerce performance data is often split across inconsistent CSV exports. Analysts must clean, join, and interpret those files before they can identify products that need attention.

## Solution

Product Pounce detects each dataset and maps its columns, then builds a unified performance dashboard entirely in the browser. It surfaces KPIs, trends, product-level signals, and inspectable data-quality issues without requiring a backend.

## Key decisions

- **Local-only processing** — files never leave the browser
- **Confidence-based auto-mapping** — only uncertain columns need review
- **Flexible inputs** — analyze one or more product, sales, and inventory files
- **Catalog-only mode** — useful insights even when sales data is unavailable
- **Prioritized signals** — rank stock, sales, margin, pricing, and reputation concerns
- **Transparent data quality** — inspect and export every detected issue
- **Adjustable analysis periods** — compare preset or custom date ranges
- **Exportable results** — download attention lists and quality reports as CSV

## Tech stack

**React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · Zustand 5 · Recharts 3 · Radix UI · Motion · Papa Parse · Vitest · Playwright**

## Run locally

```bash
npm install
npm run dev
```
