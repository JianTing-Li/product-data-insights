export function formatCurrency(value: number | undefined | null, currency: string = 'USD'): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
  }
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatPercent(value: number | undefined | null, options?: { signed?: boolean }): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  const pct = value * 100
  const sign = options?.signed && pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

export function formatDays(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  if (!Number.isFinite(value)) return 'No recent sales'
  return `${value.toFixed(1)} days`
}

/** Formats a start/end date pair for display, e.g. "Jun 8–28, 2026" when
 * both fall in the same month, or "Jan 3 – Jun 28, 2026" when they don't.
 * Dates are read as UTC (matching how this app constructs them from parsed
 * CSV rows) so the displayed day never shifts with the viewer's timezone. */
export function formatDateRange(start: Date, end: Date): string {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth()

  if (sameMonth) {
    const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(start)
    return `${month} ${start.getUTCDate()}–${end.getUTCDate()}, ${end.getUTCFullYear()}`
  }

  const startOpts: Intl.DateTimeFormatOptions = sameYear
    ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
    : { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
  const startLabel = new Intl.DateTimeFormat('en-US', startOpts).format(start)
  const endLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(end)
  return `${startLabel} – ${endLabel}`
}
