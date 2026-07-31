import Papa from 'papaparse'
import type { CsvParseIssue, RawRow } from '@/lib/processing/types'

export type { CsvParseIssue }

export interface CsvParseResult {
  headers: string[]
  rows: RawRow[]
  issues: CsvParseIssue[]
}

/** Parses CSV text into headers + string-keyed rows. Values are kept as raw
 * strings (no type coercion) so leading zeroes and formatting are preserved;
 * numeric/date/currency interpretation happens in later pipeline stages.
 * Malformed rows are never dropped — they are parsed as best-effort and
 * reported in `issues` so callers can flag or reject them explicitly. */
export function parseCsv(text: string): CsvParseResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    transform: (value) => value,
  })

  const headers = result.meta.fields ?? []
  const rows: RawRow[] = result.data.map((row) => {
    const clean: RawRow = {}
    for (const header of headers) {
      clean[header] = (row[header] ?? '').toString()
    }
    return clean
  })

  const issues: CsvParseIssue[] = result.errors.map((err) => ({
    row: typeof err.row === 'number' ? err.row + 2 : -1, // +1 for header row, +1 for 1-indexing
    message: err.message,
  }))

  return { headers, rows, issues }
}
