# Product Pounce

Product intelligence for e-commerce analysts.

Product Pounce helps e-commerce analysts at small and medium-sized companies combine
product, sales, and inventory CSV files into a clean product-performance dashboard and
a prioritized list of products to investigate — entirely in the browser, with no backend.

## Stack

React, TypeScript, Vite, Tailwind CSS, Radix UI primitives, Recharts, Motion, Zustand,
Vitest, Playwright.

## Development

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build static files to `dist/`
- `npm run preview` — preview the production build
- `npm run lint` — lint with oxlint
- `npm run test` — run unit tests once
- `npm run test:watch` — run unit tests in watch mode
- `npm run e2e` — run Playwright end-to-end tests (builds and serves the app first)

## Architecture

The CSV parsing, cleaning, aggregation, joins, metrics, and product-signal logic live in
`src/lib/processing/` as pure, dependency-free TypeScript modules, independent of React.
UI components consume the pipeline's output only through the Zustand store in `src/state/`.
