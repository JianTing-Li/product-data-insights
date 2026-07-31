import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatPercent } from '@/lib/format'

interface KpiCardProps {
  label: string
  value: string
  changePct?: number
  changeIsGood?: 'up' | 'down' | 'neutral'
}

export function KpiCard({ label, value, changePct, changeIsGood = 'up' }: KpiCardProps) {
  const isPositive = (changePct ?? 0) >= 0
  const goodDirection = changeIsGood === 'up' ? isPositive : changeIsGood === 'down' ? !isPositive : true

  return (
    <Card className="p-4" data-testid={`kpi-card-${label}`}>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{value}</p>
      {changePct !== undefined && (
        <p
          className={cn(
            'mt-1 inline-flex items-center gap-1 text-xs font-medium',
            goodDirection ? 'text-success-600 dark:text-success-500' : 'text-danger-600 dark:text-danger-500',
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {formatPercent(changePct, { signed: true })} vs previous period
        </p>
      )}
    </Card>
  )
}
