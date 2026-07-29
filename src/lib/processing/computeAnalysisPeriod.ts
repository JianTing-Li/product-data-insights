import type { AnalysisPeriod } from './types'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

/** Computes the current/previous comparison windows from the latest date
 * present in the data. Returns null when there are no valid dates at all
 * (nothing to anchor a period to). The previous window is only populated
 * when the dataset's earliest date fully covers it — a partial previous
 * week would make the comparison misleading, so we withhold it rather than
 * fabricate a comparison from incomplete history. */
export function computeAnalysisPeriod(dates: Date[], lengthDays: 7 | 30): AnalysisPeriod | null {
  if (dates.length === 0) return null

  const times = dates.map((d) => d.getTime())
  const latest = new Date(Math.max(...times))
  const earliest = new Date(Math.min(...times))

  const currentEnd = latest
  const currentStart = addDays(latest, -(lengthDays - 1))
  const previousEnd = addDays(currentStart, -1)
  const previousStart = addDays(previousEnd, -(lengthDays - 1))

  const hasSufficientHistory = earliest.getTime() <= previousStart.getTime()

  return {
    lengthDays,
    current: { start: currentStart, end: currentEnd },
    previous: hasSufficientHistory ? { start: previousStart, end: previousEnd } : null,
    hasSufficientHistory,
    datasetLatestDate: latest,
  }
}
