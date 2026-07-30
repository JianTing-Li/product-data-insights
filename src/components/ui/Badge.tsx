import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  accent: 'bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300',
  success: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500',
  danger: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
