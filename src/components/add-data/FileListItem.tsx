import { AlertTriangle, FileText, X } from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import type { AddedFile, DatasetKind } from '@/lib/processing/types'

const kindLabel: Record<DatasetKind, string> = {
  sales: 'Sales',
  products: 'Products',
  inventory: 'Inventory',
}

const kindTone: Record<DatasetKind, BadgeTone> = {
  sales: 'accent',
  products: 'success',
  inventory: 'warning',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileListItem({ file, onRemove }: { file: AddedFile; onRemove: (id: string) => void }) {
  if (file.status === 'error') {
    return (
      <li className="animate-fade-in flex items-center justify-between gap-4 rounded-lg border border-danger-500/30 bg-danger-50 px-4 py-3 dark:bg-danger-500/5">
        <div className="flex min-w-0 items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-500" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{file.filename}</p>
            <p className="text-xs text-danger-700 dark:text-danger-400">{file.error}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label={`Remove ${file.filename}`}
          onClick={() => onRemove(file.id)}
          className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
        >
          <X className="h-4 w-4" />
        </button>
      </li>
    )
  }

  return (
    <li className="animate-fade-in flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{file.filename}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatBytes(file.sizeBytes)} · {file.rowCount.toLocaleString()} rows
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {file.datasetKind ? (
          <Badge tone={kindTone[file.datasetKind]}>{kindLabel[file.datasetKind]}</Badge>
        ) : (
          <Badge tone="neutral">Detecting…</Badge>
        )}
        <button
          type="button"
          aria-label={`Remove ${file.filename}`}
          onClick={() => onRemove(file.id)}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}
