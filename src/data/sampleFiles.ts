import { ingestFile } from '@/lib/processing/ingestFile'
import type { AddedFile } from '@/lib/processing/types'

export type SampleDataKind = 'full' | 'catalog-only'

const SAMPLE_MANIFEST: Record<SampleDataKind, string[]> = {
  full: ['full-sales.csv', 'full-products.csv', 'full-inventory.csv'],
  'catalog-only': ['catalog-only-products.csv'],
}

async function fetchAsFile(path: string): Promise<File> {
  const response = await fetch(`/sample-data/${path}`)
  if (!response.ok) {
    throw new Error(`Failed to load sample file ${path}: ${response.status}`)
  }
  const text = await response.text()
  return new File([text], path, { type: 'text/csv' })
}

/** Loads bundled sample data through the exact same parsing + detection
 * pipeline used for user uploads. The "full" set pairs real Amazon product
 * rows with illustrative sales/inventory data keyed to those same product
 * IDs; "catalog-only" is a real, unmodified slice of the Amazon product
 * export with no fabricated data at all. */
export async function loadSampleFiles(kind: SampleDataKind): Promise<AddedFile[]> {
  const files = await Promise.all(SAMPLE_MANIFEST[kind].map(fetchAsFile))
  return Promise.all(files.map((f) => ingestFile(f, 'sample')))
}
