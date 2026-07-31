import { computeKpis, computeProductMetrics, computeRevenueDeclineContribution } from './metrics'
import { runPipeline } from './pipeline'
import { generateProductSignals } from './signals'
import type { AddedFile, AnalysisResult, FileMapping, PeriodSelection } from './types'

/** Runs the complete pipeline — parse, clean, aggregate, join, calculate
 * metrics, generate signals — producing the final AnalysisResult the
 * dashboard renders. This is the single entry point the UI should call. */
export function runFullAnalysis(
  files: AddedFile[],
  mappings: Record<string, FileMapping>,
  periodLength: PeriodSelection,
): AnalysisResult {
  const pipeline = runPipeline(files, mappings, periodLength)
  const kpis = computeKpis(pipeline.overallSales)

  const withMetrics = pipeline.products.map((product) => {
    const salesAgg = pipeline.salesAggregates.get(product.sku)
    return { ...product, ...computeProductMetrics(product, salesAgg, pipeline.period) }
  })

  const declineContribution = computeRevenueDeclineContribution(withMetrics, kpis)
  const withContribution = withMetrics.map((product) => ({
    ...product,
    revenueDeclineContributionPct: declineContribution.get(product.sku),
  }))

  const withSignals = withContribution.map((product) =>
    generateProductSignals(product, { dataQuality: pipeline.dataQuality, currency: pipeline.currency }),
  )

  return {
    mode: pipeline.mode,
    products: withSignals,
    kpis,
    period: pipeline.period,
    dataQuality: pipeline.dataQuality,
    datasetsPresent: pipeline.datasetsPresent,
    dailySeries: pipeline.dailySeries,
    currency: pipeline.currency,
  }
}
