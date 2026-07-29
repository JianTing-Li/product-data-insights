export type CsvCell = string | number | null | undefined

const DANGEROUS_LEADING_CHARS = /^[=+\-@\t\r]/

/** Neutralizes spreadsheet formula injection: a cell whose value starts
 * with =, +, -, @, tab, or carriage return would be interpreted as a
 * formula by Excel/Sheets when the CSV is opened. Prefixing with a single
 * quote forces it to be treated as literal text, matching the standard
 * OWASP-recommended mitigation. */
function escapeCsvCell(raw: string): string {
  let value = raw
  if (DANGEROUS_LEADING_CHARS.test(value)) {
    value = `'${value}`
  }
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    value = `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Builds a CSV string from headers + rows. Every cell is protected against
 * formula injection and properly quoted regardless of source. */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers.map((h) => escapeCsvCell(h)).join(',')]
  for (const row of rows) {
    lines.push(row.map((cell) => escapeCsvCell(cell === null || cell === undefined ? '' : String(cell))).join(','))
  }
  return lines.join('\r\n')
}
