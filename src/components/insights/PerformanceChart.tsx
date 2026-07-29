import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAnalysisStore } from '@/state/analysisStore'
import { formatCurrency, formatNumber } from '@/lib/format'

interface ChartPoint {
  date: string
  revenue: number
  orders: number
  units: number
}

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

export function PerformanceChart({ series }: { series: ChartPoint[] }) {
  const metric = useAnalysisStore((s) => s.chartMetric)
  const setMetric = useAnalysisStore((s) => s.setChartMetric)
  const reducedMotion = useReducedMotion()

  const formatValue = metric === 'revenue' ? formatCurrency : formatNumber

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Performance</h3>
        <Select
          ariaLabel="Chart metric"
          value={metric}
          onValueChange={(v) => setMetric(v as 'revenue' | 'orders' | 'units')}
          options={metricOptions}
        />
      </div>
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
              width={56}
              tickFormatter={(v: number) => (metric === 'revenue' ? `$${v}` : `${v}`)}
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
