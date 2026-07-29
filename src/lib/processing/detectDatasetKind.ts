import { FIELD_DEFINITIONS_BY_KIND } from './fieldDefinitions'
import { mapColumns } from './mapColumns'
import type { ColumnMapping, DatasetKind } from './types'

export type DetectionConfidence = 'high' | 'medium' | 'low'

export interface DatasetDetectionResult {
  kind: DatasetKind
  confidence: DetectionConfidence
  scores: Record<DatasetKind, number>
}

const ALL_KINDS: DatasetKind[] = ['sales', 'products', 'inventory']

const CONFIDENCE_WEIGHT: Record<ColumnMapping['confidence'], number> = {
  high: 1,
  medium: 0.75,
  low: 0.4,
  none: 0,
}

function scoreKind(headers: string[], kind: DatasetKind): number {
  const fields = FIELD_DEFINITIONS_BY_KIND[kind]
  const required = fields.filter((f) => f.required)
  if (required.length === 0) return 0
  const mappings = mapColumns(headers, kind)
  const total = required.reduce((sum, field) => {
    const mapping = mappings.find((m) => m.field === field.field)
    return sum + (mapping ? CONFIDENCE_WEIGHT[mapping.confidence] : 0)
  }, 0)
  return total / required.length
}

/** Picks the most likely dataset kind for a file based on how well its
 * headers cover each dataset's required fields. Confidence reflects both how
 * complete the best match is and how far ahead it is of the runner-up, so
 * genuinely ambiguous files surface as low/medium confidence for the user to
 * confirm rather than being silently guessed. */
export function detectDatasetKind(headers: string[]): DatasetDetectionResult {
  const scores = Object.fromEntries(ALL_KINDS.map((kind) => [kind, scoreKind(headers, kind)])) as Record<
    DatasetKind,
    number
  >

  const ranked = [...ALL_KINDS].sort((a, b) => scores[b] - scores[a])
  const best = ranked[0]
  const runnerUp = ranked[1]
  const bestScore = scores[best]
  const gap = bestScore - scores[runnerUp]

  let confidence: DetectionConfidence
  if (bestScore >= 0.99 && gap >= 0.3) {
    confidence = 'high'
  } else if (bestScore >= 0.6) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return { kind: best, confidence, scores }
}
