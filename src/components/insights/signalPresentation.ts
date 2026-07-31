import type { BadgeTone } from '@/components/ui/Badge'
import type { ProductSignal, SignalId, SignalSeverity } from '@/lib/processing/types'

export const severityTone: Record<SignalSeverity, BadgeTone> = {
  high: 'danger',
  medium: 'warning',
  low: 'accent',
}

// Shorter labels for the compact badge context (product cards, table rows) where
// the full signal title would wrap. Detail views (e.g. SignalFullDetail's heading)
// keep using signal.title directly since space isn't as tight there.
const badgeLabelOverrides: Partial<Record<SignalId, string>> = {
  'slow-moving-inventory': 'Slow-moving',
}

export function signalBadgeLabel(signal: Pick<ProductSignal, 'id' | 'title'>): string {
  return badgeLabelOverrides[signal.id] ?? signal.title
}
