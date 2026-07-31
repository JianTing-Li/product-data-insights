import { useState } from 'react'
import { motion } from 'motion/react'
import { Info } from 'lucide-react'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { Card } from '@/components/ui/Card'
import { OverviewView } from './OverviewView'
import { AllProductsView } from './AllProductsView'
import { DataQualityView } from './DataQualityView'
import { useAnalysisStore } from '@/state/analysisStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useScrollToTopOnChange } from '@/hooks/useScrollToTopOnChange'

const tabItems = [
  { value: 'overview', label: 'Overview' },
  { value: 'all-products', label: 'All products' },
  { value: 'data-quality', label: 'Data quality' },
]

export function InsightsStep() {
  const analysis = useAnalysisStore((s) => s.analysis)
  const [tab, setTab] = useState('overview')
  const reducedMotion = useReducedMotion()
  useScrollToTopOnChange(tab)

  if (!analysis) return null

  return (
    <div className="flex flex-col gap-6">
      {analysis.mode === 'catalog-only' && (
        <Card className="flex items-start gap-3 border-accent-200 bg-accent-50/60 px-4 py-3 dark:border-accent-900 dark:bg-accent-900/10">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-600 dark:text-accent-300" aria-hidden="true" />
          <div className="text-sm text-accent-900 dark:text-accent-200">
            <p>Add sales data to unlock revenue and performance trends.</p>
            <p>Add inventory data to unlock stockout and restocking signals.</p>
          </div>
        </Card>
      )}

      <Tabs items={tabItems} value={tab} onValueChange={setTab}>
        <motion.div
          key={tab}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <TabPanel value="overview" className="pt-6 focus:outline-none">
            <OverviewView analysis={analysis} onNavigate={setTab} />
          </TabPanel>
          <TabPanel value="all-products" className="pt-6 focus:outline-none">
            <AllProductsView analysis={analysis} />
          </TabPanel>
          <TabPanel value="data-quality" className="pt-6 focus:outline-none">
            <DataQualityView report={analysis.dataQuality} />
          </TabPanel>
        </motion.div>
      </Tabs>
    </div>
  )
}
