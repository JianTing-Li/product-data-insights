import { Badge } from '@/components/ui/Badge'
import type { ColumnMapping, FieldDefinition } from '@/lib/processing/types'

export function MappingTable({
  fields,
  mappings,
}: {
  fields: FieldDefinition[]
  mappings: ColumnMapping[]
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Field</th>
            <th scope="col" className="px-3 py-2 font-medium">Source column</th>
            <th scope="col" className="px-3 py-2 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {fields.map((field) => {
            const mapping = mappings.find((m) => m.field === field.field)
            return (
              <tr key={field.field}>
                <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">
                  {field.label}
                  {field.required && <span className="ml-1 text-xs text-neutral-400">required</span>}
                </td>
                <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
                  {mapping?.sourceColumn ?? <span className="italic text-neutral-400">not mapped</span>}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    tone={
                      mapping?.confidence === 'high'
                        ? 'success'
                        : mapping?.confidence === 'medium'
                          ? 'warning'
                          : mapping?.confidence === 'low'
                            ? 'warning'
                            : 'neutral'
                    }
                  >
                    {mapping?.confidence === 'none' || !mapping ? 'unmapped' : mapping.confidence}
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
