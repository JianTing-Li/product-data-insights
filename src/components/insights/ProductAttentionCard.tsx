import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { severityTone, signalBadgeLabel } from './signalPresentation'
import type { ProductPerformance } from '@/lib/processing/types'

interface ProductAttentionCardProps {
  product: ProductPerformance
  onInspect: (sku: string) => void
}

export function ProductAttentionCard({ product, onInspect }: ProductAttentionCardProps) {
  const signal = product.primarySignal
  if (!signal) return null

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Inspect ${product.productName}`}
      onClick={() => onInspect(product.sku)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onInspect(product.sku)
        }
      }}
      className="relative flex cursor-pointer flex-col gap-3 p-4 transition-[box-shadow,border-color] duration-150 hover:border-neutral-300 hover:shadow-md dark:hover:border-neutral-700"
    >
      <ChevronRight
        className="absolute right-3 top-3 h-4 w-4 text-neutral-300 dark:text-neutral-600"
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3 pr-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {product.productName}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{product.sku}</p>
        </div>
        <Badge tone={severityTone[signal.severity]}>{signalBadgeLabel(signal)}</Badge>
      </div>

      <dl className="flex flex-wrap gap-x-4 gap-y-1">
        {signal.supportingValues.slice(0, 3).map((sv) => (
          <div key={sv.label} className="flex items-baseline gap-1 text-sm">
            <dt className="text-neutral-500 dark:text-neutral-400">{sv.label}:</dt>
            <dd className="font-medium text-neutral-800 dark:text-neutral-100">{sv.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
