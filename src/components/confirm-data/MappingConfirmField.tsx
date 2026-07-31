import { AlertTriangle } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import type { FieldDefinition } from '@/lib/processing/types'

interface MappingConfirmFieldProps {
  field: FieldDefinition
  sourceColumn: string | null
  headers: string[]
  onChange: (column: string | null) => void
}

export function MappingConfirmField({ field, sourceColumn, headers, onChange }: MappingConfirmFieldProps) {
  const options = [
    { value: '__none__', label: 'Not present in this file' },
    ...headers.map((h) => ({ value: h, label: h })),
  ]

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-warning-500/30 bg-warning-50 px-3 py-2.5 dark:bg-warning-500/5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600 dark:text-warning-500" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {field.label}
            {field.required && <span className="ml-1 text-warning-600 dark:text-warning-500">(required)</span>}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            We couldn't confidently match a column. Please confirm which one to use.
          </p>
        </div>
      </div>
      <Select
        ariaLabel={`Column for ${field.label}`}
        value={sourceColumn ?? '__none__'}
        onValueChange={(v) => onChange(v === '__none__' ? null : v)}
        options={options}
        className="sm:min-w-[220px]"
      />
    </div>
  )
}
