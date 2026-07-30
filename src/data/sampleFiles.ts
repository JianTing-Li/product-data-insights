import { ingestFile } from '@/lib/processing/ingestFile'
import type { AddedFile } from '@/lib/processing/types'

export type SampleCompany = 'amazon' | 'walmart' | 'shopee' | 'shein' | 'lazada'

export const SAMPLE_COMPANIES: { value: SampleCompany; label: string }[] = [
  { value: 'amazon', label: 'Amazon' },
  { value: 'walmart', label: 'Walmart' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'shein', label: 'Shein' },
  { value: 'lazada', label: 'Lazada' },
]

async function fetchAsFile(path: string): Promise<File> {
  const response = await fetch(`/sample-data/${path}`)
  if (!response.ok) {
    throw new Error(`Failed to load sample file ${path}: ${response.status}`)
  }
  const text = await response.text()
  return new File([text], path, { type: 'text/csv' })
}

/** Loads a company's bundled sample data through the exact same parsing +
 * detection pipeline used for user uploads: real product catalog rows
 * paired with illustrative sales/inventory data keyed to those same real
 * product IDs. */
export async function loadSampleFiles(company: SampleCompany): Promise<AddedFile[]> {
  const paths = [`${company}-sales.csv`, `${company}-products.csv`, `${company}-inventory.csv`]
  const files = await Promise.all(paths.map(fetchAsFile))
  return Promise.all(files.map((f) => ingestFile(f, 'sample')))
}
