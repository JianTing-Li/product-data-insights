import type { AnalysisPeriod, PeriodSelection } from './types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

/** Parses a 'YYYY-MM-DD' string as a UTC midnight Date. Returns null for
 * anything malformed or for calendar-invalid dates (e.g. Feb 30). */
function parseIsoDateUtc(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }
  return date
}

function daysBetweenInclusive(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1
}

/** Computes the current/previous comparison windows. For a fixed-length
 * preset (7/14/30/90), the current window is anchored to the latest date
 * present in the data, exactly as before. For a custom range, the current
 * window is the explicit start/end the user chose, and the previous window
 * is an equal-length window immediately preceding it, so the comparison
 * stays apples-to-apples regardless of which mode produced the period.
 *
 * Either mode is clamped to the dataset's actual [earliest, latest] date
 * range when the request extends beyond it (e.g. "Last 90 days" on a
 * 20-day-old dataset, or a custom range partly outside the data) — the
 * caller sees this via `isClamped` and the now-smaller `lengthDays`, rather
 * than silently computing metrics like avg-daily-units against a window
 * that includes days with no data at all.
 *
 * Returns null when there are no valid dates at all (nothing to anchor a
 * period to), for a custom range that fails to parse, or when clamping
 * leaves no overlap between the request and the data at all. The previous
 * window is only populated when the dataset's earliest date fully covers
 * it — a partial previous window would make the comparison misleading, so
 * we withhold it rather than fabricate a comparison from incomplete
 * history. */
export function computeAnalysisPeriod(dates: Date[], selection: PeriodSelection): AnalysisPeriod | null {
  if (dates.length === 0) return null

  const times = dates.map((d) => d.getTime())
  const latest = new Date(Math.max(...times))
  const earliest = new Date(Math.min(...times))

  let currentStart: Date
  let currentEnd: Date
  let requestedLengthDays: number

  if (typeof selection === 'number') {
    currentEnd = latest
    currentStart = addDays(latest, -(selection - 1))
    requestedLengthDays = selection
  } else {
    const start = parseIsoDateUtc(selection.startDate)
    const end = parseIsoDateUtc(selection.endDate)
    if (!start || !end || end.getTime() < start.getTime()) return null
    currentStart = start
    currentEnd = end
    requestedLengthDays = daysBetweenInclusive(start, end)
  }

  let isClamped = false
  if (currentStart.getTime() < earliest.getTime()) {
    currentStart = earliest
    isClamped = true
  }
  if (currentEnd.getTime() > latest.getTime()) {
    currentEnd = latest
    isClamped = true
  }
  // The request fell entirely outside the data (e.g. a custom range wholly
  // before the earliest or after the latest date) — clamping each bound
  // independently can leave them crossed, meaning there's no real overlap.
  if (currentEnd.getTime() < currentStart.getTime()) return null

  const lengthDays = daysBetweenInclusive(currentStart, currentEnd)

  const previousEnd = addDays(currentStart, -1)
  const previousStart = addDays(previousEnd, -(lengthDays - 1))

  const hasSufficientHistory = earliest.getTime() <= previousStart.getTime()

  return {
    lengthDays,
    requestedLengthDays,
    isClamped,
    current: { start: currentStart, end: currentEnd },
    previous: hasSufficientHistory ? { start: previousStart, end: previousEnd } : null,
    hasSufficientHistory,
    datasetEarliestDate: earliest,
    datasetLatestDate: latest,
  }
}
