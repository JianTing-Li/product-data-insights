import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export function AttentionSummary({ count, total }: { count: number; total: number }) {
  if (count === 0) {
    return (
      <Card className="flex items-center gap-3 border-success-500/30 bg-success-50/60 px-4 py-3 dark:bg-success-500/5">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600 dark:text-success-500" aria-hidden="true" />
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          No products currently show an attention signal out of {total.toLocaleString()} analyzed.
        </p>
      </Card>
    )
  }
  return (
    <Card className="flex items-center gap-3 border-warning-500/30 bg-warning-50/60 px-4 py-3 dark:bg-warning-500/5">
      <AlertCircle className="h-5 w-5 shrink-0 text-warning-600 dark:text-warning-500" aria-hidden="true" />
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">{count.toLocaleString()}</span>{' '}
        of {total.toLocaleString()} products need attention.
      </p>
    </Card>
  )
}
