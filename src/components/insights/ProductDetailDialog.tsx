import { Dialog } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { Collapsible } from '@/components/ui/Collapsible'
import { SignalFullDetail } from './SignalFullDetail'
import { severityTone } from './signalPresentation'
import { formatCurrency, formatDays, formatNumber, formatPercent } from '@/lib/format'
import type { ProductPerformance } from '@/lib/processing/types'

interface ProductDetailDialogProps {
  product: ProductPerformance | null
  onClose: () => void
}

export function ProductDetailDialog({ product, onClose }: ProductDetailDialogProps) {
  return (
    <Dialog
      open={product !== null}
      onOpenChange={(open) => !open && onClose()}
      title={product?.productName ?? ''}
      description={product?.sku}
    >
      {product && (
        <div className="flex flex-col gap-6">
          {/* Summary */}
          <section aria-label="Summary" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {product.category && <Badge tone="neutral">{product.category}</Badge>}
              {product.primarySignal && (
                <Badge tone={severityTone[product.primarySignal.severity]}>{product.primarySignal.title}</Badge>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Current price</dt>
                <dd className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(product.currentPrice)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Revenue (current period)</dt>
                <dd className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(product.revenueCurrent)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Units sold (current period)</dt>
                <dd className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatNumber(product.unitsCurrent)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Available inventory</dt>
                <dd className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatNumber(product.availableInventory)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Evidence */}
          <Collapsible trigger={`Evidence — all signals (${product.signals.length || 0})`} defaultOpen>
            <div className="flex flex-col gap-3 pb-2 pt-1">
              {product.signals.length > 0 ? (
                product.signals.map((s) => <SignalFullDetail key={s.id} signal={s} />)
              ) : (
                <p className="text-sm italic text-neutral-500 dark:text-neutral-400">
                  No attention signals were detected for this product.
                </p>
              )}
            </div>
          </Collapsible>

          {/* Calculations */}
          <Collapsible trigger="Calculations">
            <div className="flex flex-col gap-2 pb-2 pt-1 text-sm">
              <CalcRow
                label="Sales change vs previous period"
                formula="(current revenue − previous revenue) ÷ previous revenue"
                value={formatPercent(product.salesChangePct, { signed: true })}
              />
              <CalcRow
                label="Average order value"
                formula="revenue ÷ distinct orders"
                value={formatCurrency(product.avgOrderValue)}
              />
              <CalcRow
                label="Gross margin"
                formula="(revenue − cost) ÷ revenue"
                value={formatPercent(product.grossMargin)}
              />
              <CalcRow
                label="Days of inventory"
                formula="available inventory ÷ average daily units"
                value={formatDays(product.daysOfInventory)}
              />
              <CalcRow
                label="Contribution to revenue decline"
                formula="this product's revenue drop ÷ total revenue drop"
                value={formatPercent(product.revenueDeclineContributionPct)}
              />
            </div>
          </Collapsible>

          {/* Source records */}
          <Collapsible trigger="Source records">
            <p className="pb-1 pt-1 text-sm italic text-neutral-500 dark:text-neutral-400">
              Source row inspection will be available once real file parsing is wired in (Phase 2/3).
            </p>
          </Collapsible>
        </div>
      )}
    </Dialog>
  )
}

function CalcRow({ label, formula, value }: { label: string; formula: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-neutral-50 px-3 py-2 dark:bg-neutral-800/60">
      <div>
        <p className="font-medium text-neutral-800 dark:text-neutral-100">{label}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{formula}</p>
      </div>
      <p className="shrink-0 font-medium text-neutral-900 dark:text-neutral-50">{value}</p>
    </div>
  )
}
