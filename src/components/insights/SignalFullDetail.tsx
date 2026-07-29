import { Badge } from '@/components/ui/Badge'
import { severityTone } from './signalPresentation'
import type { ProductSignal } from '@/lib/processing/types'

export function SignalFullDetail({ signal }: { signal: ProductSignal }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{signal.title}</h4>
        <Badge tone={severityTone[signal.severity]}>{signal.severity}</Badge>
      </div>
      <p className="text-sm text-neutral-700 dark:text-neutral-300">{signal.detected}</p>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {signal.supportingValues.map((sv) => (
          <div key={sv.label} className="rounded-md bg-neutral-50 px-2.5 py-1.5 dark:bg-neutral-800/60">
            <dt className="text-[11px] text-neutral-500 dark:text-neutral-400">{sv.label}</dt>
            <dd className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{sv.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex flex-col gap-1.5 text-sm">
        <p>
          <span className="font-medium text-neutral-700 dark:text-neutral-300">Why it matters: </span>
          <span className="text-neutral-600 dark:text-neutral-400">{signal.whyItMatters}</span>
        </p>
        <p>
          <span className="font-medium text-neutral-700 dark:text-neutral-300">Suggested investigation: </span>
          <span className="text-neutral-600 dark:text-neutral-400">{signal.suggestedInvestigation}</span>
        </p>
        <p className="text-neutral-500 dark:text-neutral-500">
          <span className="font-medium">Limitation: </span>
          {signal.limitation}
        </p>
      </div>
    </div>
  )
}
