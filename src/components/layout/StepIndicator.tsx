import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Step } from '@/state/analysisStore'

const steps: { step: Step; label: string }[] = [
  { step: 1, label: 'Add data' },
  { step: 2, label: 'Confirm data' },
  { step: 3, label: 'View insights' },
]

export function StepIndicator({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4" aria-label="Analysis progress">
      {steps.map(({ step, label }, index) => {
        const state = step < current ? 'done' : step === current ? 'current' : 'upcoming'
        return (
          <li key={step} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200',
                  state === 'done' && 'bg-accent-600 text-white',
                  state === 'current' && 'bg-accent-100 text-accent-700 ring-2 ring-accent-500 dark:bg-accent-900/50 dark:text-accent-200',
                  state === 'upcoming' && 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500',
                )}
              >
                {state === 'done' ? <Check className="h-3.5 w-3.5" /> : step}
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  state === 'current' ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-500 dark:text-neutral-400',
                )}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span className="h-px w-4 shrink-0 bg-neutral-300 sm:w-8 dark:bg-neutral-700" aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
