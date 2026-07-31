import { describe, expect, it } from 'vitest'
import { parseCsv } from './parseCsv'

describe('parseCsv', () => {
  it('parses headers and rows', () => {
    const csv = 'a,b,c\n1,2,3\n4,5,6'
    const result = parseCsv(csv)
    expect(result.headers).toEqual(['a', 'b', 'c'])
    expect(result.rows).toEqual([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
    ])
  })

  it('preserves leading zeroes and text-like values as strings', () => {
    const csv = 'sku,quantity\n00123,007'
    const result = parseCsv(csv)
    expect(result.rows[0].sku).toBe('00123')
    expect(result.rows[0].quantity).toBe('007')
  })

  it('does not strip hyphens from SKUs', () => {
    const csv = 'sku\nABC-123-XYZ'
    const result = parseCsv(csv)
    expect(result.rows[0].sku).toBe('ABC-123-XYZ')
  })

  it('handles quoted fields with embedded commas and newlines', () => {
    const csv = 'name,description\n"Widget, Deluxe","Line one\nLine two"'
    const result = parseCsv(csv)
    expect(result.rows[0].name).toBe('Widget, Deluxe')
    expect(result.rows[0].description).toBe('Line one\nLine two')
  })

  it('trims whitespace from headers', () => {
    const csv = ' order_id , quantity \n1,2'
    const result = parseCsv(csv)
    expect(result.headers).toEqual(['order_id', 'quantity'])
  })

  it('skips fully empty lines without producing empty rows', () => {
    const csv = 'a,b\n1,2\n\n3,4\n'
    const result = parseCsv(csv)
    expect(result.rows).toHaveLength(2)
  })

  it('reports issues for ragged rows without dropping them', () => {
    const csv = 'a,b,c\n1,2\n4,5,6,7'
    const result = parseCsv(csv)
    expect(result.rows).toHaveLength(2)
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('returns empty headers and rows for empty input', () => {
    const result = parseCsv('')
    expect(result.headers).toEqual([])
    expect(result.rows).toEqual([])
  })

  it('fills missing trailing fields with empty string rather than dropping the row', () => {
    const csv = 'a,b,c\n1,2'
    const result = parseCsv(csv)
    expect(result.rows[0]).toEqual({ a: '1', b: '2', c: '' })
  })
})
