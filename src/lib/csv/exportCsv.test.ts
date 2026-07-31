import { describe, expect, it } from 'vitest'
import { toCsv } from './exportCsv'

describe('toCsv', () => {
  it('joins headers and rows with commas', () => {
    const csv = toCsv(['a', 'b'], [['1', '2']])
    expect(csv).toBe('a,b\r\n1,2')
  })

  it('quotes cells containing commas', () => {
    const csv = toCsv(['name'], [['Widget, Deluxe']])
    expect(csv).toContain('"Widget, Deluxe"')
  })

  it('escapes embedded quotes by doubling them', () => {
    const csv = toCsv(['name'], [['6" Cable']])
    expect(csv).toContain('"6"" Cable"')
  })

  it('quotes cells containing newlines', () => {
    const csv = toCsv(['note'], [['line one\nline two']])
    expect(csv).toContain('"line one\nline two"')
  })

  it('converts numbers and null/undefined to safe string cells', () => {
    const csv = toCsv(['a', 'b', 'c'], [[12.5, null, undefined]])
    expect(csv).toBe('a,b,c\r\n12.5,,')
  })

  describe('formula injection protection', () => {
    const dangerousPrefixes = ['=', '+', '-', '@']

    for (const prefix of dangerousPrefixes) {
      it(`prefixes a cell starting with "${prefix}" with a single quote`, () => {
        const csv = toCsv(['formula'], [[`${prefix}SUM(A1:A10)`]])
        const dataLine = csv.split('\r\n')[1]
        expect(dataLine.startsWith(`'${prefix}`)).toBe(true)
      })
    }

    it('prefixes a cell starting with a tab character', () => {
      const csv = toCsv(['formula'], [['\tcmd']])
      const dataLine = csv.split('\r\n')[1]
      expect(dataLine.startsWith("'\t") || dataLine.startsWith('"\'\t')).toBe(true)
    })

    it('prefixes a cell starting with a carriage return', () => {
      const csv = toCsv(['formula'], [['\rcmd']])
      const dataLine = csv.split('\r\n')[1]
      expect(dataLine.includes("'\r")).toBe(true)
    })

    it('does not alter a normal-looking value', () => {
      const csv = toCsv(['name'], [['Widget']])
      expect(csv).toBe('name\r\nWidget')
    })

    it('does not treat a mid-string = as dangerous', () => {
      const csv = toCsv(['formula'], [['a=b']])
      const dataLine = csv.split('\r\n')[1]
      expect(dataLine).toBe('a=b')
    })

    it('protects an actual malicious DDE/formula payload', () => {
      const payload = '=cmd|\'/C calc\'!A1'
      const csv = toCsv(['cell'], [[payload]])
      const dataLine = csv.split('\r\n')[1]
      expect(dataLine.startsWith("'=") || dataLine.startsWith('"\'=')).toBe(true)
      expect(dataLine).not.toBe(payload)
    })
  })
})
