import type { AddedFile, DatasetKind, FileMapping, RawRow } from './types'

export interface SourceRowGroup {
  fileId: string
  filename: string
  datasetKind: DatasetKind
  rows: RawRow[]
}

/** Finds every raw source row across the uploaded files that references a
 * given product ID, for the product detail view's "source records" section.
 * Matches on the file's own mapped SKU column, so it works regardless of
 * what that column was named in the original file. */
export function findSourceRows(sku: string, files: AddedFile[], mappings: Record<string, FileMapping>): SourceRowGroup[] {
  const groups: SourceRowGroup[] = []

  for (const file of files) {
    if (file.status !== 'parsed') continue
    const mapping = mappings[file.id]
    if (!mapping) continue
    const skuColumn = mapping.mappings.find((m) => m.field === 'sku')?.sourceColumn
    if (!skuColumn) continue

    const rows = file.rows.filter((row) => row[skuColumn] === sku)
    if (rows.length > 0) {
      groups.push({ fileId: file.id, filename: file.filename, datasetKind: mapping.datasetKind, rows })
    }
  }

  return groups
}
