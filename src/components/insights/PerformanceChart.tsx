import { Info } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAnalysisStore } from '@/state/analysisStore'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDateRange, formatNumber } from '@/lib/format'
import type { AnalysisPeriod, DailySalesPoint } from '@/lib/processing/types'

const metricOptions = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'orders', label: 'Orders' },
  { value: 'units', label: 'Units sold' },
]

const metricLabel: Record<'revenue' | 'orders' | 'units', string> = {
  revenue: 'Revenue',
  orders: 'Orders',
  units: 'Units sold',
}

export function PerformanceChart({
  series,
  currency,
  period,
}: {
  series: DailySalesPoint[]
  currency: string
  period: AnalysisPeriod | null
}) {
  const metric = useAnalysisStore((s) => s.chartMetric)
  const setMetric = useAnalysisStore((s) => s.setChartMetric)
  const reducedMotion = useReducedMotion()

  const formatValue = (v: number) => (metric === 'revenue' ? formatCurrency(v, currency) : formatNumber(v))

  // Recharts' YAxis width is a fixed pixel box, not an auto-sizing one — size it off the
  // longest label actually in play so large currency values (e.g. IDR in the hundreds of
  // millions) don't get clipped, while small datasets keep the compact default width.
  const longestYAxisLabelLength = series.reduce(
    (max, point) => Math.max(max, formatValue(point[metric]).length),
    0,
  )
  const yAxisWidth = Math.max(56, longestYAxisLabelLength * 7 + 16)

  const clampedRange =
    period?.isClamped && period.datasetEarliestDate && period.datasetLatestDate
      ? { lengthDays: period.lengthDays, earliest: period.datasetEarliestDate, latest: period.datasetLatestDate }
      : null

  if (series.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Performance</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No dated sales rows were available to chart.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className={cn('flex items-center justify-between gap-3', clampedRange ? 'mb-1' : 'mb-3')}>
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Performance</h3>
        <Select
          ariaLabel="Chart metric"
          value={metric}
          onValueChange={(v) => setMetric(v as 'revenue' | 'orders' | 'units')}
          options={metricOptions}
        />
      </div>
      {clampedRange && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Showing {clampedRange.lengthDays} day{clampedRange.lengthDays === 1 ? '' : 's'} — full data range (
          {formatDateRange(clampedRange.earliest, clampedRange.latest)})
        </p>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-500)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => d.slice(5)}
              tick={{ fontSize: 12, fill: 'currentColor' }}
              className="text-neutral-500"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'currentColor' }}
              className="text-neutral-500"
              axisLine={false}
              tickLine={false}
              width={yAxisWidth}
              tickFormatter={(v: number) => formatValue(v)}
            />
            <Tooltip
              formatter={(value) => [formatValue(Number(value)), metricLabel[metric]]}
              contentStyle={{ borderRadius: 8, fontSize: 13 }}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke="var(--color-accent-500)"
              strokeWidth={2}
              fill="url(#chartFill)"
              isAnimationActive={!reducedMotion}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
