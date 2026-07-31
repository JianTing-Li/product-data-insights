import { useMemo, useState } from 'react'
import { ArrowRight, Download } from 'lucide-react'
import { KpiCard } from './KpiCard'
import { AttentionSummary } from './AttentionSummary'
import { ProductAttentionCard } from './ProductAttentionCard'
import { PerformanceChart } from './PerformanceChart'
import { ProductDetailDialog } from './ProductDetailDialog'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { formatCurrency, formatDateRange, formatNumber } from '@/lib/format'
import { toCsv } from '@/lib/csv/exportCsv'
import { downloadCsv } from '@/lib/csv/downloadCsv'
import { buildProductAttentionTable } from '@/lib/processing/exportRows'
import { useAnalysisStore } from '@/state/analysisStore'
import type { AnalysisResult, PeriodLength, SignalSeverity } from '@/lib/processing/types'

const severityRank: Record<SignalSeverity, number> = { high: 0, medium: 1, low: 2 }

const periodOptions = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
]

const dateInputClassName =
  'rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100'

function toIsoDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function OverviewView({
  analysis,
  onNavigate,
}: {
  analysis: AnalysisResult
  onNavigate: (tab: 'all-products' | 'data-quality') => void
}) {
  const [selectedSku, setSelectedSku] = useState<string | null>(null)
  const periodLength = useAnalysisStore((s) => s.periodLength)
  const setPeriodLength = useAnalysisStore((s) => s.setPeriodLength)

  // Whether the Period control is showing the custom start/end date inputs.
  // Kept separate from the store's periodLength so switching to "Custom
  // range" reveals the pickers immediately without discarding the last
  // resolved analysis (and thus the whole Period row) while the user is
  // still picking dates — the store only updates once both dates are valid.
  const [periodMode, setPeriodMode] = useState<'preset' | 'custom'>(
    typeof periodLength === 'number' ? 'preset' : 'custom',
  )
  const [customStart, setCustomStart] = useState(typeof periodLength === 'object' ? periodLength.startDate : '')
  const [customEnd, setCustomEnd] = useState(typeof periodLength === 'object' ? periodLength.endDate : '')
  const customRangeInvalid = customStart !== '' && customEnd !== '' && customEnd < customStart

  function handlePeriodSelectChange(value: string) {
    if (value === 'custom') {
      setPeriodMode('custom')
      if (customStart && customEnd && customEnd >= customStart) {
        setPeriodLength({ startDate: customStart, endDate: customEnd })
      }
    } else {
      setPeriodMode('preset')
      setPeriodLength(Number(value) as PeriodLength)
    }
  }

  function handleCustomDateChange(field: 'start' | 'end', value: string) {
    const nextStart = field === 'start' ? value : customStart
    const nextEnd = field === 'end' ? value : customEnd
    if (field === 'start') setCustomStart(value)
    else setCustomEnd(value)
    if (nextStart && nextEnd && nextEnd >= nextStart) {
      setPeriodLength({ startDate: nextStart, endDate: nextEnd })
    }
  }

  const productsNeedingAttention = useMemo(
    () => analysis.products.filter((p) => p.primarySignal),
    [analysis.products],
  )

  const topFive = useMemo(
    () =>
      [...productsNeedingAttention]
        .sort((a, b) => severityRank[a.primarySignal!.severity] - severityRank[b.primarySignal!.severity])
        .slice(0, 5),
    [productsNeedingAttention],
  )

  const catalogInsights = useMemo(() => {
    if (analysis.mode !== 'catalog-only') return null
    return {
      productCount: analysis.products.length,
      pricingConcerns: analysis.products.filter((p) => p.signals.some((s) => s.id === 'price-integrity-risk')).length,
      reputationConcerns: analysis.products.filter((p) => p.signals.some((s) => s.id === 'reputation-concern')).length,
      dataQualityIssues: analysis.products.filter((p) => p.signals.some((s) => s.id === 'data-quality-hold')).length,
    }
  }, [analysis.mode, analysis.products])

  const selectedProduct = analysis.products.find((p) => p.sku === selectedSku) ?? null

  function handleExportAttention() {
    const table = buildProductAttentionTable(productsNeedingAttention)
    downloadCsv('product-attention.csv', toCsv(table.headers, table.rows))
  }

  return (
    <div className="flex flex-col gap-8">
      {analysis.mode === 'full' && analysis.period && (
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Period</span>
            <Select
              ariaLabel="Analysis period"
              value={periodMode === 'custom' ? 'custom' : String(periodLength)}
              onValueChange={handlePeriodSelectChange}
              options={periodOptions}
            />
            {periodMode === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="Custom range start date"
                  value={customStart}
                  min={analysis.period.datasetEarliestDate ? toIsoDateString(analysis.period.datasetEarliestDate) : undefined}
                  max={customEnd || (analysis.period.datasetLatestDate ? toIsoDateString(analysis.period.datasetLatestDate) : undefined)}
                  onChange={(e) => handleCustomDateChange('start', e.target.value)}
                  className={dateInputClassName}
                />
                <span className="text-sm text-neutral-400">to</span>
                <input
                  type="date"
                  aria-label="Custom range end date"
                  value={customEnd}
                  min={customStart || (analysis.period.datasetEarliestDate ? toIsoDateString(analysis.period.datasetEarliestDate) : undefined)}
                  max={analysis.period.datasetLatestDate ? toIsoDateString(analysis.period.datasetLatestDate) : undefined}
                  onChange={(e) => handleCustomDateChange('end', e.target.value)}
                  className={dateInputClassName}
                />
                {customRangeInvalid && (
                  <span className="text-xs text-danger-600 dark:text-danger-500">End date must be after start date</span>
                )}
              </div>
            )}
          </div>
          {analysis.period.datasetEarliestDate && analysis.period.datasetLatestDate && (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              Data range: {formatDateRange(analysis.period.datasetEarliestDate, analysis.period.datasetLatestDate)}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {analysis.mode === 'full' ? (
          <>
            {analysis.kpis.revenue && (
              <KpiCard
                label="Revenue"
                value={formatCurrency(analysis.kpis.revenue.current, analysis.currency)}
                changePct={analysis.kpis.revenue.changePct}
              />
            )}
            {analysis.kpis.orders && (
              <KpiCard
                label="Orders"
                value={formatNumber(analysis.kpis.orders.current)}
                changePct={analysis.kpis.orders.changePct}
              />
            )}
            {analysis.kpis.units && (
              <KpiCard
                label="Units sold"
                value={formatNumber(analysis.kpis.units.current)}
                changePct={analysis.kpis.units.changePct}
              />
            )}
            {analysis.kpis.avgOrderValue && (
              <KpiCard
                label="Average order value"
                value={formatCurrency(analysis.kpis.avgOrderValue.current, analysis.currency)}
                changePct={analysis.kpis.avgOrderValue.changePct}
              />
            )}
          </>
        ) : (
          catalogInsights && (
            <>
              <KpiCard label="Product count" value={formatNumber(catalogInsights.productCount)} />
              <KpiCard label="Pricing concerns" value={formatNumber(catalogInsights.pricingConcerns)} />
              <KpiCard label="Reputation concerns" value={formatNumber(catalogInsights.reputationConcerns)} />
              <KpiCard label="Data-quality issues" value={formatNumber(catalogInsights.dataQualityIssues)} />
            </>
          )
        )}
      </div>

      <AttentionSummary count={productsNeedingAttention.length} total={analysis.products.length} />

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Highest-priority products
          </h2>
          <div className="flex items-center gap-2">
            {productsNeedingAttention.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleExportAttention}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onNavigate('all-products')}>
              View all products
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
        {topFive.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {topFive.map((product) => (
              <ProductAttentionCard key={product.sku} product={product} onInspect={setSelectedSku} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No products currently need attention.
          </p>
        )}
      </section>

      {analysis.mode === 'full' && (
        <PerformanceChart series={analysis.dailySeries} currency={analysis.currency} period={analysis.period} />
      )}

      <ProductDetailDialog product={selectedProduct} currency={analysis.currency} onClose={() => setSelectedSku(null)} />
    </div>
  )
}
