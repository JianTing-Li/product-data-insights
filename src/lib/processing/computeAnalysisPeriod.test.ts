import { describe, expect, it } from 'vitest'
import { computeAnalysisPeriod } from './computeAnalysisPeriod'

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

describe('computeAnalysisPeriod', () => {
  it('returns null when there are no dates', () => {
    expect(computeAnalysisPeriod([], 7)).toBeNull()
  })

  it('uses the latest date as the endpoint', () => {
    const dates = [utcDate('2026-07-10'), utcDate('2026-07-28'), utcDate('2026-07-15')]
    const period = computeAnalysisPeriod(dates, 7)
    expect(period?.datasetLatestDate?.toISOString().slice(0, 10)).toBe('2026-07-28')
  })

  it('builds a 7-day current window ending on the latest date', () => {
    const dates = [utcDate('2026-06-01'), utcDate('2026-07-28')]
    const period = computeAnalysisPeriod(dates, 7)
    expect(period?.current.start.toISOString().slice(0, 10)).toBe('2026-07-22')
    expect(period?.current.end.toISOString().slice(0, 10)).toBe('2026-07-28')
  })

  it('builds a contiguous, equal-length previous window', () => {
    const dates = [utcDate('2026-06-01'), utcDate('2026-07-28')]
    const period = computeAnalysisPeriod(dates, 7)
    expect(period?.previous?.start.toISOString().slice(0, 10)).toBe('2026-07-15')
    expect(period?.previous?.end.toISOString().slice(0, 10)).toBe('2026-07-21')
  })

  it('supports a 30-day window', () => {
    const dates = [utcDate('2026-01-01'), utcDate('2026-07-28')]
    const period = computeAnalysisPeriod(dates, 30)
    expect(period?.current.start.toISOString().slice(0, 10)).toBe('2026-06-29')
    expect(period?.previous?.start.toISOString().slice(0, 10)).toBe('2026-05-30')
  })

  it('withholds the previous period when history does not fully cover it', () => {
    // Only 3 days of history before the current window starts — not enough for a full previous 7-day window.
    const dates = [utcDate('2026-07-19'), utcDate('2026-07-28')]
    const period = computeAnalysisPeriod(dates, 7)
    expect(period?.hasSufficientHistory).toBe(false)
    expect(period?.previous).toBeNull()
  })

  it('includes the previous period when history exactly covers it', () => {
    const dates = [utcDate('2026-07-15'), utcDate('2026-07-28')]
    const period = computeAnalysisPeriod(dates, 7)
    expect(period?.hasSufficientHistory).toBe(true)
    expect(period?.previous).not.toBeNull()
  })
})
