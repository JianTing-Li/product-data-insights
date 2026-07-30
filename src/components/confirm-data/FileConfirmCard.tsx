import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Collapsible } from '@/components/ui/Collapsible'
import { Select } from '@/components/ui/Select'
import { MappingConfirmField } from './MappingConfirmField'
import { MappingTable } from './MappingTable'
import { RawPreview } from './RawPreview'
import { FIELD_DEFINITIONS_BY_KIND, DATASET_LABELS } from '@/lib/processing/fieldDefinitions'
import type { AddedFile, DatasetKind, FileMapping } from '@/lib/processing/types'

interface FileConfirmCardProps {
  file: AddedFile
  mapping: FileMapping
  onMappingChange: (mapping: FileMapping) => void
  onDatasetKindChange: (kind: DatasetKind) => void
}

const kindOptions = (Object.keys(DATASET_LABELS) as DatasetKind[]).map((kind) => ({
  value: kind,
  label: DATASET_LABELS[kind],
}))

export function FileConfirmCard({ file, mapping, onMappingChange, onDatasetKindChange }: FileConfirmCardProps) {
  const fields = FIELD_DEFINITIONS_BY_KIND[mapping.datasetKind]
  const uncertainFields = fields.filter((f) => {
    const m = mapping.mappings.find((x) => x.field === f.field)
    return f.required && (!m || m.confidence === 'none' || m.confidence === 'low')
  })
  const kindIsUncertain = file.detectionConfidence !== 'high'

  function updateField(fieldName: string, column: string | null) {
    onMappingChange({
      ...mapping,
      mappings: mapping.mappings.map((m) =>
        m.field === fieldName ? { ...m, sourceColumn: column, confidence: column ? 'high' : 'none' } : m,
      ),
    })
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{file.filename}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{file.rowCount.toLocaleString()} rows</p>
        </div>
        <div className="flex items-center gap-2">
          {kindIsUncertain ? (
            <Select
              ariaLabel={`Dataset type for ${file.filename}`}
              value={mapping.datasetKind}
              onValueChange={(v) => onDatasetKindChange(v as DatasetKind)}
              options={kindOptions}
            />
          ) : (
            <Badge tone="accent">{DATASET_LABELS[mapping.datasetKind]}</Badge>
          )}
          <Badge tone={file.detectionConfidence === 'high' ? 'success' : 'warning'}>
            {file.detectionConfidence === 'high' ? 'Detected automatically' : `Please confirm — ${file.detectionConfidence} confidence`}
          </Badge>
        </div>
      </div>

      {uncertainFields.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {uncertainFields.map((field) => {
            const m = mapping.mappings.find((x) => x.field === field.field)
            return (
              <MappingConfirmField
                key={field.field}
                field={field}
                sourceColumn={m?.sourceColumn ?? null}
                headers={file.headers}
                onChange={(col) => updateField(field.field, col)}
              />
            )
          })}
        </div>
      )}

      <div className="mt-4 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        <Collapsible trigger="Full Column Mapping">
          <div className="pb-3 pt-1">
            <MappingTable fields={fields} mappings={mapping.mappings} />
          </div>
        </Collapsible>
        <Collapsible trigger="Raw Data">
          <div className="pb-1 pt-1">
            <RawPreview headers={file.headers} rows={file.rows.slice(0, 8)} />
          </div>
        </Collapsible>
      </div>
    </Card>
  )
}
