import * as RadixDialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  const reducedMotion = useReducedMotion()

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {/* React itself conditionally renders this tree on `open`; AnimatePresence holds
          it mounted for one extra tick so the exit animation can play. forceMount tells
          Radix not to also short-circuit rendering based on its own open/closed state
          during that extra tick. */}
      <AnimatePresence>
        {open && (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-[1px]"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  'fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(720px,92vw)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg focus:outline-none dark:border-neutral-800 dark:bg-neutral-900',
                  className,
                )}
                // x/y recenter the fixed box (replaces the old -translate-x/y-1/2 utility
                // classes) — kept as motion values, not a CSS transform class, so they
                // combine correctly with the animated `scale` below instead of one
                // clobbering the other's `transform` property.
                style={{ x: '-50%', y: '-50%' }}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {/* Scrolling lives on this inner element, not the rounded outer one above — keeps the
                    corners clipped by the outer's overflow-hidden even during momentum/overscroll. */}
                <div className="max-h-[85vh] overflow-y-auto p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <RadixDialog.Title className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                        {title}
                      </RadixDialog.Title>
                      {description && (
                        <RadixDialog.Description className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                          {description}
                        </RadixDialog.Description>
                      )}
                    </div>
                    <RadixDialog.Close asChild>
                      <button
                        aria-label="Close"
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </RadixDialog.Close>
                  </div>
                  {children}
                </div>
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  )
}
