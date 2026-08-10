# Product Pounce

**A browser-based product intelligence tool that turns messy e-commerce CSV exports into a prioritized list of what needs attention — no backend, no spreadsheet gymnastics.**

**Live demo:** [product-pounce.vercel.app](https://product-pounce.vercel.app/)

## The problem

E-commerce analysts don't have a data problem — they have a *data assembly* problem. Product catalogs, sales exports, and inventory reports come from different systems, with different column names, different currency formats, and no guaranteed way to line up on the same product ID. Before anyone can ask "which products are actually losing us money," someone has to manually clean three CSVs, guess at column mappings, and stitch them together in a spreadsheet — every single time.

Product Pounce removes that step. Drop in your files, and it does the cleaning, mapping, and joining for you, then tells you which products deserve a closer look and why.

## The solution: a 3-step flow

**Add data → Confirm data → View insights.**

No sidebar, no settings screen, no mode to configure first — just the steps in the order you'd actually take them:

1. **Add data** — drag in one or more product, sales, and inventory CSVs (or try a bundled real-company sample). Everything is processed locally in the browser; files are never uploaded anywhere.
2. **Confirm data** — the app detects what kind of file each one is and maps its columns automatically. You only step in when a mapping is uncertain — high-confidence matches are pre-filled and collapsed by default, so confirming a clean file takes one click.
3. **View insights** — a dashboard built around one question: *what needs my attention first?*

That ordering matters. Most tools ask you to configure everything up front; this one gets out of the way until it actually needs a decision from you, and even a single products file (no sales or inventory) still produces a useful catalog-only view instead of an error.

## Product decisions worth calling out

- **Local-only processing.** There is no server in this app — parsing, column mapping, joining, and metric calculation all run in the browser via a pure TypeScript pipeline. For a tool built around a company's sales and inventory data, "your files never leave your machine" isn't a footnote, it's the pitch.
- **Confidence-based auto-mapping, not an all-or-nothing wizard.** Column mapping runs a tiered match (exact → substring → fuzzy) and tags each result high/medium/low confidence. Only the uncertain ones surface for review — the goal was to eliminate the busywork of manually mapping fifteen columns for a file that clearly has a `sku` and a `price`.
- **Analysis periods anchored to the data, not to today.** "Last 7 days" doesn't mean the 7 calendar days ending today — it means the 7 days ending on the *latest date actually present in the dataset*, since most exports are historical snapshots, not live feeds. If a preset would reach before the data starts, the window is clamped rather than silently including phantom zero-sales days, and a period-over-period comparison is only shown when there's enough history to make it meaningful — no fabricated "vs. previous period" numbers from partial data.
- **Grain-safe joins.** Sales, products, and inventory are aggregated *before* joining, not joined row-by-row, specifically to avoid the classic spreadsheet bug where a one-to-many join silently multiplies revenue.
- **Ten deterministic, explainable signals** (out-of-stock, sales decline, fast-growing, slow-moving inventory, margin concern, reputation concern, price-integrity risk, data-quality hold, and more) — each with the value that triggered it, why it matters, and a suggested next investigation. They're phrased as things worth looking into, not verdicts, because the data alone can't tell you *why* a product's sales dropped.
- **Rows are the click target, not a button.** Product tables originally had a trailing "Inspect" button in its own column; it was cut in favor of making the entire row clickable (with a proper accessible name and keyboard handling), since the action people actually want on a data table is "click the thing I'm looking at," not "find the button at the end of the row."
- **A deliberately small dashboard.** Four KPI cards, one prioritized attention list, one performance chart. The temptation with a data tool is to show everything; this one shows the top five products that need a decision and lets you drill in from there via progressive disclosure (evidence → calculations → source rows), rather than surfacing every metric at once.
- **Nothing is silently dropped.** Every rejected or warned row is categorized with a reason and is inspectable and exportable — essential trust for a tool whose entire job is "tell me what to trust."

## Tech stack

Pulled directly from `package.json`:

- **React 19** + **TypeScript** + **Vite** — app shell and build
- **Tailwind CSS 4** — styling
- **Zustand** — app state
- **Radix UI** (Dialog, AlertDialog, Tabs, Collapsible, Select, Toast, Tooltip) — accessible interaction primitives
- **Recharts** — the performance trend chart
- **Motion** — transitions, respecting `prefers-reduced-motion`
- **PapaParse** — CSV parsing
- **Vitest** + **Testing Library** — unit tests (260+ tests covering parsing, mapping, joins, metrics, and every signal)
- **Playwright** — end-to-end coverage of the full add → confirm → analyze flow, exports, and keyboard accessibility

## Screenshots

> _Add screenshots or a short GIF here — the flow below is the most useful thing to capture:_

- `## Add data` — the drag-and-drop step with a sample-company picker
- `## Confirm data` — auto-detected column mapping
- `## Overview` — KPI cards + prioritized attention list
- `## Product detail` — progressive-disclosure evidence panel

## Try it without any files

Product Pounce ships with real bundled sample data from five companies (Amazon, Walmart, Shopee, Shein, Lazada) so you can see the full dashboard immediately — no CSV required.

## Run it locally

```bash
npm install
npm run dev
```

Other useful scripts: `npm run build`, `npm test`, `npm run e2e`.
