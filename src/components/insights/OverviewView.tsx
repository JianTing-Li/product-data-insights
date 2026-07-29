import { useMemo, useState } from 'react'
import { ArrowRight, Download } from 'lucide-react'
import { KpiCard } from './KpiCard'
import { AttentionSummary } from './AttentionSummary'
import { ProductAttentionCard } from './ProductAttentionCard'
import { PerformanceChart } from './PerformanceChart'
import { ProductDetailDialog } from './ProductDetailDialog'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { formatCurrency, formatNumber } from '@/lib/format'
import { toCsv } from '@/lib/csv/exportCsv'
import { downloadCsv } from '@/lib/csv/downloadCsv'
import { buildProductAttentionTable } from '@/lib/processing/exportRows'
import { useAnalysisStore } from '@/state/analysisStore'
import type { AnalysisResult, SignalSeverity } from '@/lib/processing/types'

const severityRank: Record<SignalSeverity, number> = { high: 0, medium: 1, low: 2 }

const periodOptions = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
]

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
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Period</span>
          <Select
            ariaLabel="Analysis period"
            value={String(periodLength)}
            onValueChange={(v) => setPeriodLength(Number(v) as 7 | 30)}
            options={periodOptions}
          />
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

      {analysis.mode === 'full' && <PerformanceChart series={analysis.dailySeries} currency={analysis.currency} />}

      <div className="flex flex-wrap gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <Button variant="secondary" size="sm" onClick={() => onNavigate('all-products')}>
          All products
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onNavigate('data-quality')}>
          Data quality
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      <ProductDetailDialog product={selectedProduct} currency={analysis.currency} onClose={() => setSelectedSku(null)} />
    </div>
  )
}
