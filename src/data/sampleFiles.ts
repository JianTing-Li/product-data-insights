import salesCsv from './sample-csv/sample-sales.csv?raw'
import productsCsv from './sample-csv/sample-products.csv?raw'
import inventoryCsv from './sample-csv/sample-inventory.csv?raw'
import { ingestFile } from '@/lib/processing/ingestFile'
import type { AddedFile } from '@/lib/processing/types'

function toFile(text: string, filename: string): File {
  return new File([text], filename, { type: 'text/csv' })
}

/** Loads the bundled sample dataset through the exact same parsing +
 * detection pipeline used for user uploads, so "Use sample data" exercises
 * real code rather than a hand-built fixture. */
export async function loadSampleFiles(): Promise<AddedFile[]> {
  const files = [
    toFile(salesCsv, 'sample-sales.csv'),
    toFile(productsCsv, 'sample-products.csv'),
    toFile(inventoryCsv, 'sample-inventory.csv'),
  ]
  return Promise.all(files.map((f) => ingestFile(f, 'sample')))
}
