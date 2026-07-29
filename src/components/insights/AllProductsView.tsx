import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ProductDetailDialog } from './ProductDetailDialog'
import { severityTone } from './signalPresentation'
import { useAnalysisStore } from '@/state/analysisStore'
import { formatCurrency, formatNumber } from '@/lib/format'
import type { AnalysisResult, SignalId } from '@/lib/processing/types'

const signalLabels: Record<SignalId, string> = {
  'out-of-stock': 'Out of stock',
  'restock-attention': 'Restock attention',
  'sales-decline': 'Sales decline',
  'fast-growing': 'Fast-growing product',
  'slow-moving-inventory': 'Slow-moving inventory',
  'margin-concern': 'Margin concern',
  'reputation-concern': 'Reputation concern',
  'promising-reputation': 'Promising reputation',
  'price-integrity-risk': 'Price-integrity risk',
  'data-quality-hold': 'Data-quality hold',
}

export function AllProductsView({ analysis }: { analysis: AnalysisResult }) {
  const filters = useAnalysisStore((s) => s.filters)
  const setFilters = useAnalysisStore((s) => s.setFilters)
  const clearFilters = useAnalysisStore((s) => s.clearFilters)
  const [selectedSku, setSelectedSku] = useState<string | null>(null)

  const hasSales = analysis.datasetsPresent.includes('sales')
  const hasInventory = analysis.datasetsPresent.includes('inventory')
  const hasRating = analysis.products.some((p) => p.rating !== undefined)
  const hasCategory = analysis.products.some((p) => p.category !== undefined)

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const p of analysis.products) if (p.category) set.add(p.category)
    return Array.from(set).sort()
  }, [analysis.products])

  const attentionTypesPresent = useMemo(() => {
    const set = new Set<SignalId>()
    for (const p of analysis.products) if (p.primarySignal) set.add(p.primarySignal.id)
    return Array.from(set)
  }, [analysis.products])

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return analysis.products.filter((p) => {
      if (search && !p.productName.toLowerCase().includes(search) && !p.sku.toLowerCase().includes(search)) {
        return false
      }
      if (filters.category && p.category !== filters.category) return false
      if (filters.attentionType !== 'all' && p.primarySignal?.id !== filters.attentionType) return false
      return true
    })
  }, [analysis.products, filters])

  const hasActiveFilters = filters.search !== '' || filters.category !== null || filters.attentionType !== 'all'
  const selectedProduct = analysis.products.find((p) => p.sku === selectedSku) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder="Search by product name or SKU"
            aria-label="Search products"
            className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-accent-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
        {hasCategory && (
          <Select
            ariaLabel="Filter by category"
            value={filters.category ?? '__all__'}
            onValueChange={(v) => setFilters({ category: v === '__all__' ? null : v })}
            options={[{ value: '__all__', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
        )}
        <Select
          ariaLabel="Filter by attention type"
          value={filters.attentionType}
          onValueChange={(v) => setFilters({ attentionType: v as SignalId | 'all' })}
          options={[
            { value: 'all', label: 'All attention types' },
            ...attentionTypesPresent.map((id) => ({ value: id, label: signalLabels[id] })),
          ]}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </Button>
        )}
      </div>

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Showing {filtered.length.toLocaleString()} of {analysis.products.length.toLocaleString()} products
      </p>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Product</th>
              {hasCategory && <th scope="col" className="px-4 py-2.5 font-medium">Category</th>}
              {hasSales && <th scope="col" className="px-4 py-2.5 font-medium">Revenue</th>}
              {hasSales && <th scope="col" className="px-4 py-2.5 font-medium">Units sold</th>}
              {hasInventory && <th scope="col" className="px-4 py-2.5 font-medium">Available inventory</th>}
              {hasRating && <th scope="col" className="px-4 py-2.5 font-medium">Rating</th>}
              <th scope="col" className="px-4 py-2.5 font-medium">Attention</th>
              <th scope="col" className="px-4 py-2.5 font-medium sr-only">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
            {filtered.map((p) => (
              <tr key={p.sku} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                <td className="max-w-[260px] px-4 py-2.5">
                  <p className="truncate font-medium text-neutral-800 dark:text-neutral-100">{p.productName}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{p.sku}</p>
                </td>
                {hasCategory && <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">{p.category ?? '—'}</td>}
                {hasSales && <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">{formatCurrency(p.revenueCurrent)}</td>}
                {hasSales && <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">{formatNumber(p.unitsCurrent)}</td>}
                {hasInventory && <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">{formatNumber(p.availableInventory)}</td>}
                {hasRating && <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">{p.rating ? `${p.rating.toFixed(1)} / 5` : '—'}</td>}
                <td className="px-4 py-2.5">
                  {p.primarySignal ? (
                    <Badge tone={severityTone[p.primarySignal.severity]}>{p.primarySignal.title}</Badge>
                  ) : (
                    <span className="text-xs text-neutral-400">None</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSku(p.sku)}>
                    Inspect
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  No products match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProductDetailDialog product={selectedProduct} onClose={() => setSelectedSku(null)} />
    </div>
  )
}
