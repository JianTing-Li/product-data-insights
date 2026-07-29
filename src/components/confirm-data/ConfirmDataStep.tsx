import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { FileConfirmCard } from './FileConfirmCard'
import { useAnalysisStore } from '@/state/analysisStore'
import { mockAutoMap } from '@/lib/processing/mockAutoMap'
import { mockAnalysis } from '@/data/mockAnalysis'

export function ConfirmDataStep() {
  const files = useAnalysisStore((s) => s.files)
  const fileMappings = useAnalysisStore((s) => s.fileMappings)
  const setFileMapping = useAnalysisStore((s) => s.setFileMapping)
  const setStep = useAnalysisStore((s) => s.setStep)
  const setAnalysis = useAnalysisStore((s) => s.setAnalysis)
  const setIsAnalyzing = useAnalysisStore((s) => s.setIsAnalyzing)
  const isAnalyzing = useAnalysisStore((s) => s.isAnalyzing)

  useEffect(() => {
    for (const file of files) {
      if (!fileMappings[file.id] && file.datasetKind) {
        setFileMapping(mockAutoMap(file.id, file.datasetKind, file.headers))
      }
    }
  }, [files, fileMappings, setFileMapping])

  function handleAnalyze() {
    setIsAnalyzing(true)
    // Mock pipeline run — replaced by the real processing pipeline in later phases.
    setTimeout(() => {
      setAnalysis(mockAnalysis)
      setIsAnalyzing(false)
      setStep(3)
    }, 500)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Confirm your data</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          We detected the dataset type and column mappings for each file. Only uncertain mappings need your review.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {files.map((file) => {
          const mapping = fileMappings[file.id]
          if (!mapping) return null
          return (
            <FileConfirmCard
              key={file.id}
              file={file}
              mapping={mapping}
              onMappingChange={setFileMapping}
            />
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <Button variant="ghost" onClick={() => setStep(1)}>
          Back to add data
        </Button>
        <Button onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? 'Analyzing…' : 'Analyze products'}
        </Button>
      </div>
    </div>
  )
}
