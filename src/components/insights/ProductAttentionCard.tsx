import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { severityTone } from './signalPresentation'
import type { ProductPerformance } from '@/lib/processing/types'

interface ProductAttentionCardProps {
  product: ProductPerformance
  onInspect: (sku: string) => void
}

export function ProductAttentionCard({ product, onInspect }: ProductAttentionCardProps) {
  const signal = product.primarySignal
  if (!signal) return null

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {product.productName}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{product.sku}</p>
        </div>
        <Badge tone={severityTone[signal.severity]}>{signal.title}</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {signal.supportingValues.slice(0, 3).map((sv) => (
          <div key={sv.label} className="rounded-md bg-neutral-50 px-2.5 py-1.5 dark:bg-neutral-800/60">
            <dt className="text-[11px] text-neutral-500 dark:text-neutral-400">{sv.label}</dt>
            <dd className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{sv.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        <span className="font-medium text-neutral-700 dark:text-neutral-300">Suggested: </span>
        {signal.suggestedInvestigation}
      </p>

      <div className="mt-1 flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => onInspect(product.sku)}>
          Inspect product
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  )
}
