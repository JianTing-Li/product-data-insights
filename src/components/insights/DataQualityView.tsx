import { Download } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { DataQualityReport } from '@/lib/processing/types'

interface QualitySection {
  key: keyof DataQualityReport
  label: string
  description: string
  count: number
}

export function DataQualityView({ report }: { report: DataQualityReport }) {
  const sections: QualitySection[] = [
    {
      key: 'unmatchedProductIds',
      label: 'Unmatched product IDs',
      description: 'Product IDs referenced in one file but not found in the product catalog.',
      count: report.unmatchedProductIds.length,
    },
    {
      key: 'invalidDates',
      label: 'Invalid dates',
      description: 'Order dates that could not be parsed.',
      count: report.invalidDates.length,
    },
    {
      key: 'invalidQuantities',
      label: 'Invalid quantities',
      description: 'Quantities that were missing, zero, negative, or non-numeric.',
      count: report.invalidQuantities.length,
    },
    {
      key: 'unparseablePrices',
      label: 'Unparseable prices',
      description: 'Price values that could not be interpreted as numbers.',
      count: report.unparseablePrices.length,
    },
    {
      key: 'duplicateSalesRows',
      label: 'Duplicate sales rows',
      description: 'Sales rows that appear to be exact or near-exact duplicates.',
      count: report.duplicateSalesRows.length,
    },
    {
      key: 'conflictingProductRecords',
      label: 'Conflicting product records',
      description: 'The same product ID appears with conflicting field values across rows.',
      count: report.conflictingProductRecords.length,
    },
    {
      key: 'missingInventory',
      label: 'Missing inventory',
      description: 'Products with sales or catalog data but no matching inventory record.',
      count: report.missingInventory.length,
    },
    {
      key: 'rejectedRows',
      label: 'Rejected rows',
      description: 'Rows that failed validation and were excluded from analysis, with reasons.',
      count: report.rejectedRows.length,
    },
  ]

  const totalIssues = sections.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {totalIssues === 0
          ? 'No data-quality issues were detected in the uploaded files.'
          : `${totalIssues.toLocaleString()} data-quality issues were detected across your files. Nothing is silently discarded — every affected row can be inspected and exported below.`}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.key} className="flex items-start justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.label}</p>
                <Badge tone={s.count > 0 ? 'warning' : 'neutral'}>{s.count.toLocaleString()}</Badge>
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{s.description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={s.count === 0}
              title="Export will be available once the data-quality pipeline is implemented."
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
