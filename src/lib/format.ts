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
