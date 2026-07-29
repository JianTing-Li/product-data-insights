import { motion } from 'motion/react'
import { AppShell } from '@/components/layout/AppShell'
import { AddDataStep } from '@/components/add-data/AddDataStep'
import { ConfirmDataStep } from '@/components/confirm-data/ConfirmDataStep'
import { InsightsStep } from '@/components/insights/InsightsStep'
import { useAnalysisStore } from '@/state/analysisStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'

function App() {
  const step = useAnalysisStore((s) => s.step)
  const reducedMotion = useReducedMotion()

  return (
    <AppShell>
      <motion.div
        key={step}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {step === 1 && <AddDataStep />}
        {step === 2 && <ConfirmDataStep />}
        {step === 3 && <InsightsStep />}
      </motion.div>
    </AppShell>
  )
}

export default App
