/** Deterministic thresholds for product signal generation. Centralized here
 * so every threshold used across the signal generators is visible and
 * adjustable in one place, rather than buried inline. */
export const SIGNAL_THRESHOLDS = {
  /** Revenue change <= this triggers "sales decline" (e.g. -0.20 = 20% drop). */
  salesDeclinePct: -0.2,
  /** Revenue change >= this triggers "fast-growing product". */
  fastGrowingPct: 0.3,
  /** Days of inventory > 0 and <= this triggers "restock attention". */
  restockAttentionMaxDays: 7,
  /** Days of inventory >= this triggers "slow-moving inventory". */
  slowMovingMinDays: 90,
  /** Gross margin below this triggers "margin concern". */
  lowMarginThreshold: 0.1,
  /** Rating below this, with enough ratings, triggers "reputation concern". */
  reputationConcernMaxRating: 3.5,
  /** Minimum rating count for a low rating to be considered meaningful. */
  reputationConcernMinRatingCount: 20,
  /** Rating at/above this, with enough ratings, triggers "promising reputation". */
  promisingReputationMinRating: 4.5,
  /** Minimum rating count for a high rating to be considered meaningful. */
  promisingReputationMinRatingCount: 100,
  /** Fractional deviation between implied and catalog selling price that
   * triggers "price-integrity risk" (e.g. 0.15 = 15% apart). */
  priceIntegrityMinDeviationPct: 0.15,
} as const

/** Display/priority order used to pick a single primary signal when a
 * product has more than one. Earlier entries take precedence. */
export const SIGNAL_PRIORITY: readonly string[] = [
  'data-quality-hold',
  'out-of-stock',
  'price-integrity-risk',
  'sales-decline',
  'margin-concern',
  'reputation-concern',
  'restock-attention',
  'slow-moving-inventory',
  'fast-growing',
  'promising-reputation',
]
