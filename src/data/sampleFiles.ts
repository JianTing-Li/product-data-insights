import { ingestFile } from '@/lib/processing/ingestFile'
import type { AddedFile } from '@/lib/processing/types'

export type SampleCompany = 'walmart' | 'shopee' | 'shein' | 'amazon'

export const SAMPLE_COMPANIES: { value: SampleCompany; label: string; catalogOnly?: boolean }[] = [
  { value: 'walmart', label: 'Walmart' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'shein', label: 'Shein' },
  { value: 'amazon', label: 'Amazon', catalogOnly: true },
]

/** Which dataset files each company's sample provides. Walmart/Shopee/Shein
 * pair a real product catalog with illustrative sales and inventory data;
 * Amazon is bundled as an unmodified real export with no fabricated
 * activity, so it only has a products file (catalog-only mode). */
const SAMPLE_FILE_KINDS: Record<SampleCompany, ('sales' | 'products' | 'inventory')[]> = {
  walmart: ['sales', 'products', 'inventory'],
  shopee: ['sales', 'products', 'inventory'],
  shein: ['sales', 'products', 'inventory'],
  amazon: ['products'],
}

async function fetchAsFile(path: string): Promise<File> {
  const response = await fetch(`/sample-data/${path}`)
  if (!response.ok) {
    throw new Error(`Failed to load sample file ${path}: ${response.status}`)
  }
  const text = await response.text()
  return new File([text], path, { type: 'text/csv' })
}

/** Loads a company's bundled sample data through the exact same parsing +
 * detection pipeline used for user uploads. Walmart/Shopee/Shein pair real
 * product catalog rows with illustrative sales/inventory data keyed to
 * those same real product IDs; Amazon is the original real export with no
 * additions, so it loads as a products-only, catalog-only sample. */
export async function loadSampleFiles(company: SampleCompany): Promise<AddedFile[]> {
  const paths = SAMPLE_FILE_KINDS[company].map((kind) => `${company}-${kind}.csv`)
  const files = await Promise.all(paths.map(fetchAsFile))
  return Promise.all(files.map((f) => ingestFile(f, 'sample')))
}
