import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { KpiCard } from './KpiCard'
import { AttentionSummary } from './AttentionSummary'
import { ProductAttentionCard } from './ProductAttentionCard'
import { PerformanceChart } from './PerformanceChart'
import { ProductDetailDialog } from './ProductDetailDialog'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatNumber } from '@/lib/format'
import { mockRevenueSeries } from '@/data/mockAnalysis'
import type { AnalysisResult, SignalSeverity } from '@/lib/processing/types'

const severityRank: Record<SignalSeverity, number> = { high: 0, medium: 1, low: 2 }

export function OverviewView({
  analysis,
  onNavigate,
}: {
  analysis: AnalysisResult
  onNavigate: (tab: 'all-products' | 'data-quality') => void
}) {
  const [selectedSku, setSelectedSku] = useState<string | null>(null)

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

  const selectedProduct = analysis.products.find((p) => p.sku === selectedSku) ?? null

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {analysis.kpis.revenue && (
          <KpiCard
            label="Revenue"
            value={formatCurrency(analysis.kpis.revenue.current)}
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
            value={formatCurrency(analysis.kpis.avgOrderValue.current)}
            changePct={analysis.kpis.avgOrderValue.changePct}
          />
        )}
      </div>

      <AttentionSummary count={productsNeedingAttention.length} total={analysis.products.length} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Highest-priority products
          </h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('all-products')}>
            View all products
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
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

      <PerformanceChart series={mockRevenueSeries} />

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

      <ProductDetailDialog product={selectedProduct} onClose={() => setSelectedSku(null)} />
    </div>
  )
}
