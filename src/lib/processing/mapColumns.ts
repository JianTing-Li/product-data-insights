import { FIELD_ALIASES } from './fieldAliases'
import { FIELD_DEFINITIONS_BY_KIND } from './fieldDefinitions'
import { levenshteinDistance } from './levenshtein'
import { normalizeKey } from './normalize'
import type { ColumnMapping, DatasetKind, FieldName, FileMapping } from './types'

interface HeaderEntry {
  index: number
  raw: string
  normalized: string
}

const MIN_MATCHABLE_LENGTH = 3

function buildAliasSet(field: FieldName, label: string): Set<string> {
  const set = new Set<string>()
  set.add(normalizeKey(label))
  set.add(normalizeKey(field))
  for (const alias of FIELD_ALIASES[field]) set.add(normalizeKey(alias))
  return set
}

function findExactMatch(entries: HeaderEntry[], used: Set<number>, aliases: Set<string>): HeaderEntry | undefined {
  return entries.find((e) => !used.has(e.index) && aliases.has(e.normalized))
}

function findPartialMatch(entries: HeaderEntry[], used: Set<number>, aliases: Set<string>): HeaderEntry | undefined {
  // Only "header contains alias" (e.g. "Product ID or SKU" contains "sku") is
  // checked, not the reverse — a short generic header like "quantity" being a
  // substring of a longer compound alias like "available quantity" would
  // otherwise false-positive-match the wrong field.
  return entries.find((e) => {
    if (used.has(e.index) || e.normalized.length < MIN_MATCHABLE_LENGTH) return false
    for (const alias of aliases) {
      if (alias.length < MIN_MATCHABLE_LENGTH) continue
      if (e.normalized.includes(alias)) return true
    }
    return false
  })
}

function findFuzzyMatch(entries: HeaderEntry[], used: Set<number>, aliases: Set<string>): HeaderEntry | undefined {
  let best: { entry: HeaderEntry; distance: number } | null = null
  for (const e of entries) {
    if (used.has(e.index) || e.normalized.length < MIN_MATCHABLE_LENGTH) continue
    for (const alias of aliases) {
      if (alias.length < MIN_MATCHABLE_LENGTH) continue
      if (Math.abs(alias.length - e.normalized.length) > 2) continue
      const distance = levenshteinDistance(alias, e.normalized)
      const threshold = alias.length <= 5 ? 1 : 2
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { entry: e, distance }
      }
    }
  }
  return best?.entry
}

/** Maps source CSV headers onto the target field schema for a dataset kind.
 * Deterministic, alias-based, no LLM involvement. Required fields are
 * resolved before optional ones so a header isn't claimed by a lower-priority
 * optional field before a required field needs it. Each header maps to at
 * most one field. */
export function mapColumns(headers: string[], datasetKind: DatasetKind): ColumnMapping[] {
  const fields = FIELD_DEFINITIONS_BY_KIND[datasetKind]
  const entries: HeaderEntry[] = headers.map((h, index) => ({ index, raw: h, normalized: normalizeKey(h) }))
  const used = new Set<number>()
  const orderedFields = [...fields].sort((a, b) => Number(b.required) - Number(a.required))
  const resultByField = new Map<FieldName, ColumnMapping>()

  for (const field of orderedFields) {
    const aliases = buildAliasSet(field.field, field.label)

    let match = findExactMatch(entries, used, aliases)
    let confidence: ColumnMapping['confidence'] = 'high'

    if (!match) {
      match = findPartialMatch(entries, used, aliases)
      confidence = 'medium'
    }

    if (!match) {
      match = findFuzzyMatch(entries, used, aliases)
      confidence = 'low'
    }

    if (match) {
      used.add(match.index)
      resultByField.set(field.field, { field: field.field, sourceColumn: match.raw, confidence })
    } else {
      resultByField.set(field.field, { field: field.field, sourceColumn: null, confidence: 'none' })
    }
  }

  return fields.map((f) => resultByField.get(f.field)!)
}

export function createFileMapping(fileId: string, datasetKind: DatasetKind, headers: string[]): FileMapping {
  return { fileId, datasetKind, mappings: mapColumns(headers, datasetKind) }
}
