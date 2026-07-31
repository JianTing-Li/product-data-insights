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

  describe('custom range', () => {
    it('uses the explicit start/end as the current window, independent of the latest data date', () => {
      const dates = [utcDate('2026-01-01'), utcDate('2026-07-28')]
      const period = computeAnalysisPeriod(dates, { startDate: '2026-03-01', endDate: '2026-03-10' })
      expect(period?.current.start.toISOString().slice(0, 10)).toBe('2026-03-01')
      expect(period?.current.end.toISOString().slice(0, 10)).toBe('2026-03-10')
      expect(period?.lengthDays).toBe(10)
    })

    it('builds a contiguous, equal-length previous window immediately before the range', () => {
      const dates = [utcDate('2026-01-01'), utcDate('2026-07-28')]
      const period = computeAnalysisPeriod(dates, { startDate: '2026-03-01', endDate: '2026-03-10' })
      expect(period?.previous?.start.toISOString().slice(0, 10)).toBe('2026-02-19')
      expect(period?.previous?.end.toISOString().slice(0, 10)).toBe('2026-02-28')
    })

    it('supports a single-day range', () => {
      const dates = [utcDate('2026-01-01'), utcDate('2026-07-28')]
      const period = computeAnalysisPeriod(dates, { startDate: '2026-03-05', endDate: '2026-03-05' })
      expect(period?.lengthDays).toBe(1)
      expect(period?.current.start.toISOString().slice(0, 10)).toBe('2026-03-05')
      expect(period?.current.end.toISOString().slice(0, 10)).toBe('2026-03-05')
    })

    it('returns null when the end date is before the start date', () => {
      const dates = [utcDate('2026-01-01'), utcDate('2026-07-28')]
      const period = computeAnalysisPeriod(dates, { startDate: '2026-03-10', endDate: '2026-03-01' })
      expect(period).toBeNull()
    })

    it('returns null for a malformed date string', () => {
      const dates = [utcDate('2026-01-01'), utcDate('2026-07-28')]
      expect(computeAnalysisPeriod(dates, { startDate: 'not-a-date', endDate: '2026-03-10' })).toBeNull()
      expect(computeAnalysisPeriod(dates, { startDate: '2026-02-30', endDate: '2026-03-10' })).toBeNull()
    })

    it('withholds the previous period when history does not fully cover it', () => {
      const dates = [utcDate('2026-03-05'), utcDate('2026-03-10')]
      const period = computeAnalysisPeriod(dates, { startDate: '2026-03-01', endDate: '2026-03-10' })
      expect(period?.hasSufficientHistory).toBe(false)
      expect(period?.previous).toBeNull()
    })
  })

  describe('clamping to the available data range', () => {
    it('is not clamped when the preset fits entirely within the data', () => {
      const dates = [utcDate('2026-01-01'), utcDate('2026-07-28')]
      const period = computeAnalysisPeriod(dates, 30)
      expect(period?.isClamped).toBe(false)
      expect(period?.lengthDays).toBe(30)
      expect(period?.requestedLengthDays).toBe(30)
    })

    it('clamps a preset that extends before the dataset\'s earliest date', () => {
      // Only 20 days of data (07-09 through 07-28), but "Last 90 days" is requested.
      const dates = [utcDate('2026-07-09'), utcDate('2026-07-28')]
      const period = computeAnalysisPeriod(dates, 90)
      expect(period?.isClamped).toBe(true)
      expect(period?.requestedLengthDays).toBe(90)
      expect(period?.lengthDays).toBe(20)
      expect(period?.current.start.toISOString().slice(0, 10)).toBe('2026-07-09')
      expect(period?.current.end.toISOString().slice(0, 10)).toBe('2026-07-28')
    })

    it('always reports the dataset\'s earliest and latest date, clamped or not', () => {
      const dates = [utcDate('2026-07-09'), utcDate('2026-07-28')]
      const period = computeAnalysisPeriod(dates, 90)
      expect(period?.datasetEarliestDate?.toISOString().slice(0, 10)).toBe('2026-07-09')
      expect(period?.datasetLatestDate?.toISOString().slice(0, 10)).toBe('2026-07-28')
    })

    it('clamps a custom range that partially precedes the dataset', () => {
      const dates = [utcDate('2026-03-05'), utcDate('2026-03-20')]
      const period = computeAnalysisPeriod(dates, { startDate: '2026-02-15', endDate: '2026-03-10' })
      expect(period?.isClamped).toBe(true)
      expect(period?.requestedLengthDays).toBe(24) // Feb 15 - Mar 10 as originally requested
      expect(period?.current.start.toISOString().slice(0, 10)).toBe('2026-03-05')
      expect(period?.current.end.toISOString().slice(0, 10)).toBe('2026-03-10')
      expect(period?.lengthDays).toBe(6)
    })

    it('clamps a custom range that partially exceeds the dataset', () => {
      const dates = [utcDate('2026-03-05'), utcDate('2026-03-20')]
      const period = computeAnalysisPeriod(dates, { startDate: '2026-03-15', endDate: '2026-04-01' })
      expect(period?.isClamped).toBe(true)
      expect(period?.current.start.toISOString().slice(0, 10)).toBe('2026-03-15')
      expect(period?.current.end.toISOString().slice(0, 10)).toBe('2026-03-20')
    })

    it('returns null for a custom range entirely outside the dataset', () => {
      const dates = [utcDate('2026-03-05'), utcDate('2026-03-20')]
      const period = computeAnalysisPeriod(dates, { startDate: '2026-01-01', endDate: '2026-01-31' })
      expect(period).toBeNull()
    })
  })
})
