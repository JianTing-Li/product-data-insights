import { parseCsv } from '@/lib/csv/parseCsv'
import { detectDatasetKind } from './detectDatasetKind'
import type { AddedFile } from './types'

/** Parses a dropped/selected CSV File and detects its likely dataset kind.
 * Never rejects a file outright for having parse issues — malformed rows are
 * still surfaced (via parseIssues) rather than silently dropped; only a
 * genuinely empty or headerless file is marked as an error. */
export async function ingestFile(file: File, source: 'upload' | 'sample' = 'upload'): Promise<AddedFile> {
  const id = crypto.randomUUID()
  const text = await file.text()
  const { headers, rows, issues } = parseCsv(text)

  if (headers.length === 0) {
    return {
      id,
      filename: file.name,
      source,
      sizeBytes: file.size,
      status: 'error',
      error: 'No columns could be detected. Confirm this is a CSV file with a header row.',
      headers: [],
      rowCount: 0,
      rows: [],
      parseIssues: issues,
    }
  }

  if (rows.length === 0) {
    return {
      id,
      filename: file.name,
      source,
      sizeBytes: file.size,
      status: 'error',
      error: 'No data rows were found below the header row.',
      headers,
      rowCount: 0,
      rows: [],
      parseIssues: issues,
    }
  }

  const detection = detectDatasetKind(headers)

  return {
    id,
    filename: file.name,
    source,
    sizeBytes: file.size,
    status: 'parsed',
    datasetKind: detection.kind,
    detectionConfidence: detection.confidence,
    headers,
    rowCount: rows.length,
    rows,
    parseIssues: issues,
  }
}
