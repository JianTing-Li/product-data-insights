import { FIELD_DEFINITIONS_BY_KIND } from './fieldDefinitions'
import type { ColumnMapping, DatasetKind, FileMapping } from './types'

// Simplified header-matching used only for the Phase 1 UI shell. Replaced in
// Phase 2 by the real normalization + alias-based detection engine.

function normalize(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function mockAutoMap(fileId: string, datasetKind: DatasetKind, headers: string[]): FileMapping {
  const normalizedHeaders = headers.map((h) => ({ raw: h, normalized: normalize(h) }))
  const fields = FIELD_DEFINITIONS_BY_KIND[datasetKind]

  const mappings: ColumnMapping[] = fields.map((field) => {
    const fieldNorm = normalize(field.label)
    const match = normalizedHeaders.find(
      (h) => h.normalized === fieldNorm || h.normalized.includes(normalize(field.field)),
    )
    if (match) {
      return { field: field.field, sourceColumn: match.raw, confidence: 'high' }
    }
    const looseMatch = normalizedHeaders.find((h) => fieldNorm.includes(h.normalized) && h.normalized.length > 2)
    if (looseMatch) {
      return { field: field.field, sourceColumn: looseMatch.raw, confidence: 'medium' }
    }
    return { field: field.field, sourceColumn: null, confidence: 'none' }
  })

  return { fileId, datasetKind, mappings }
}
