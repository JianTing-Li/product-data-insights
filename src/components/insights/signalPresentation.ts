import type { BadgeTone } from '@/components/ui/Badge'
import type { SignalSeverity } from '@/lib/processing/types'

export const severityTone: Record<SignalSeverity, BadgeTone> = {
  high: 'danger',
  medium: 'warning',
  low: 'accent',
}
