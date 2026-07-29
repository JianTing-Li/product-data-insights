import { useState, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { StepIndicator } from './StepIndicator'
import { Button } from '@/components/ui/Button'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { useAnalysisStore } from '@/state/analysisStore'

export function AppShell({ children }: { children: ReactNode }) {
  const step = useAnalysisStore((s) => s.step)
  const hasProgress = useAnalysisStore((s) => s.files.length > 0 || s.analysis !== null)
  const reset = useAnalysisStore((s) => s.reset)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                Product Pounce
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Product intelligence for e-commerce analysts
              </p>
            </div>
            {hasProgress && (
              <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                New analysis
              </Button>
            )}
          </div>
          <StepIndicator current={step} />
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
      <AlertDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Start a new analysis?"
        description="This clears all added files, mappings, results, and filters from this browser session. This cannot be undone."
        confirmLabel="Start new analysis"
        destructive
        onConfirm={() => {
          reset()
          setConfirmOpen(false)
        }}
      />
    </div>
  )
}
