import { describe, expect, it } from 'vitest'
import { findSourceRows } from './findSourceRows'
import type { AddedFile, FileMapping } from './types'

function salesFile(id: string, rows: Record<string, string>[]): AddedFile {
  return {
    id,
    filename: `${id}.csv`,
    source: 'upload',
    sizeBytes: 100,
    status: 'parsed',
    datasetKind: 'sales',
    detectionConfidence: 'high',
    headers: ['order_id', 'sku'],
    rowCount: rows.length,
    rows,
    parseIssues: [],
  }
}

function salesMapping(fileId: string): FileMapping {
  return {
    fileId,
    datasetKind: 'sales',
    mappings: [{ field: 'sku', sourceColumn: 'sku', confidence: 'high' }],
  }
}

describe('findSourceRows', () => {
  it('finds rows matching the given sku via the mapped column', () => {
    const file = salesFile('f1', [{ order_id: 'O1', sku: 'A' }, { order_id: 'O2', sku: 'B' }])
    const groups = findSourceRows('A', [file], { f1: salesMapping('f1') })
    expect(groups).toHaveLength(1)
    expect(groups[0].rows).toHaveLength(1)
    expect(groups[0].rows[0].order_id).toBe('O1')
  })

  it('returns no group when the sku does not appear in the file', () => {
    const file = salesFile('f1', [{ order_id: 'O1', sku: 'B' }])
    const groups = findSourceRows('A', [file], { f1: salesMapping('f1') })
    expect(groups).toHaveLength(0)
  })

  it('searches across multiple files', () => {
    const f1 = salesFile('f1', [{ order_id: 'O1', sku: 'A' }])
    const f2 = salesFile('f2', [{ order_id: 'O2', sku: 'A' }])
    const groups = findSourceRows('A', [f1, f2], { f1: salesMapping('f1'), f2: salesMapping('f2') })
    expect(groups).toHaveLength(2)
  })

  it('skips files with no sku mapping', () => {
    const file = salesFile('f1', [{ order_id: 'O1', sku: 'A' }])
    const mapping: FileMapping = { fileId: 'f1', datasetKind: 'sales', mappings: [] }
    expect(findSourceRows('A', [file], { f1: mapping })).toHaveLength(0)
  })

  it('skips unparsed files', () => {
    const file = { ...salesFile('f1', [{ order_id: 'O1', sku: 'A' }]), status: 'error' as const }
    expect(findSourceRows('A', [file], { f1: salesMapping('f1') })).toHaveLength(0)
  })
})
