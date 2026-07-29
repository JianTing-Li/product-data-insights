import { Download } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Collapsible } from '@/components/ui/Collapsible'
import { toCsv } from '@/lib/csv/exportCsv'
import { downloadCsv } from '@/lib/csv/downloadCsv'
import {
  buildConflictingProductRecordsTable,
  buildDataQualitySummaryTable,
  buildDuplicateSalesRowsTable,
  buildInvalidDatesTable,
  buildInvalidQuantitiesTable,
  buildMissingInventoryTable,
  buildRejectedRowsTable,
  buildUnmatchedProductIdsTable,
  buildUnparseablePricesTable,
} from '@/lib/processing/dataQualityExports'
import type { CsvTable } from '@/lib/processing/exportRows'
import type { DataQualityReport } from '@/lib/processing/types'

interface QualitySection {
  key: string
  label: string
  description: string
  table: CsvTable
}

const PREVIEW_ROW_LIMIT = 8

export function DataQualityView({ report }: { report: DataQualityReport }) {
  const sections: QualitySection[] = [
    {
      key: 'unmatchedProductIds',
      label: 'Unmatched product IDs',
      description: 'Product IDs referenced in one file but not found in the product catalog.',
      table: buildUnmatchedProductIdsTable(report.unmatchedProductIds),
    },
    {
      key: 'invalidDates',
      label: 'Invalid dates',
      description: 'Order dates that could not be parsed.',
      table: buildInvalidDatesTable(report.invalidDates),
    },
    {
      key: 'invalidQuantities',
      label: 'Invalid quantities',
      description: 'Quantities that were missing, zero, negative, or non-numeric.',
      table: buildInvalidQuantitiesTable(report.invalidQuantities),
    },
    {
      key: 'unparseablePrices',
      label: 'Unparseable prices',
      description: 'Price values that could not be interpreted as numbers.',
      table: buildUnparseablePricesTable(report.unparseablePrices),
    },
    {
      key: 'duplicateSalesRows',
      label: 'Duplicate sales rows',
      description: 'Sales rows that appear to be exact or near-exact duplicates.',
      table: buildDuplicateSalesRowsTable(report.duplicateSalesRows),
    },
    {
      key: 'conflictingProductRecords',
      label: 'Conflicting product records',
      description: 'The same product ID appears with conflicting field values across rows.',
      table: buildConflictingProductRecordsTable(report.conflictingProductRecords),
    },
    {
      key: 'missingInventory',
      label: 'Missing inventory',
      description: 'Products with sales or catalog data but no matching inventory record.',
      table: buildMissingInventoryTable(report.missingInventory),
    },
    {
      key: 'rejectedRows',
      label: 'Rejected rows',
      description: 'Rows that failed validation and were excluded from analysis, with reasons.',
      table: buildRejectedRowsTable(report.rejectedRows),
    },
  ]

  const totalIssues = sections.reduce((sum, s) => sum + s.table.rows.length, 0)

  function handleExportSection(section: QualitySection) {
    downloadCsv(`${section.key}.csv`, toCsv(section.table.headers, section.table.rows))
  }

  function handleExportSummary() {
    const table = buildDataQualitySummaryTable(report)
    downloadCsv('data-quality-summary.csv', toCsv(table.headers, table.rows))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {totalIssues === 0
            ? 'No data-quality issues were detected in the uploaded files.'
            : `${totalIssues.toLocaleString()} data-quality issues were detected across your files. Nothing is silently discarded — every affected row can be inspected and exported below.`}
        </p>
        <Button variant="secondary" size="sm" onClick={handleExportSummary} disabled={totalIssues === 0}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export summary
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.key} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.label}</p>
                  <Badge tone={s.table.rows.length > 0 ? 'warning' : 'neutral'}>{s.table.rows.length.toLocaleString()}</Badge>
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{s.description}</p>
              </div>
              <Button variant="ghost" size="sm" disabled={s.table.rows.length === 0} onClick={() => handleExportSection(s)}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export
              </Button>
            </div>
            {s.table.rows.length > 0 && (
              <Collapsible trigger={`Inspect ${s.table.rows.length > PREVIEW_ROW_LIMIT ? `first ${PREVIEW_ROW_LIMIT} of ` : ''}${s.table.rows.length.toLocaleString()} row${s.table.rows.length === 1 ? '' : 's'}`}>
                <div className="overflow-x-auto pb-1 pt-1">
                  <table className="w-full text-left text-xs">
                    <thead className="text-neutral-500 dark:text-neutral-400">
                      <tr>
                        {s.table.headers.map((h) => (
                          <th key={h} scope="col" className="whitespace-nowrap px-2 py-1 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {s.table.rows.slice(0, PREVIEW_ROW_LIMIT).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="max-w-[160px] truncate whitespace-nowrap px-2 py-1 text-neutral-600 dark:text-neutral-400">
                              {cell ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Collapsible>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
