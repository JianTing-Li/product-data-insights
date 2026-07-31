import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FileConfirmCard } from './FileConfirmCard'
import { useAnalysisStore } from '@/state/analysisStore'
import { createFileMapping } from '@/lib/processing/mapColumns'
import type { DatasetKind } from '@/lib/processing/types'

export function ConfirmDataStep() {
  const files = useAnalysisStore((s) => s.files)
  const fileMappings = useAnalysisStore((s) => s.fileMappings)
  const setFileMapping = useAnalysisStore((s) => s.setFileMapping)
  const updateFile = useAnalysisStore((s) => s.updateFile)
  const setStep = useAnalysisStore((s) => s.setStep)
  const runAnalysis = useAnalysisStore((s) => s.runAnalysis)
  const setIsAnalyzing = useAnalysisStore((s) => s.setIsAnalyzing)
  const isAnalyzing = useAnalysisStore((s) => s.isAnalyzing)

  const parsedFiles = files.filter((f) => f.status === 'parsed')
  const erroredFiles = files.filter((f) => f.status === 'error')

  useEffect(() => {
    for (const file of files) {
      if (file.status === 'parsed' && !fileMappings[file.id] && file.datasetKind) {
        setFileMapping(createFileMapping(file.id, file.datasetKind, file.headers))
      }
    }
  }, [files, fileMappings, setFileMapping])

  function handleDatasetKindChange(fileId: string, kind: DatasetKind) {
    const file = files.find((f) => f.id === fileId)
    if (!file) return
    updateFile(fileId, { datasetKind: kind, detectionConfidence: 'high' })
    setFileMapping(createFileMapping(fileId, kind, file.headers))
  }

  function handleAnalyze() {
    setIsAnalyzing(true)
    // Deferred so the "Analyzing…" state paints before the (synchronous) pipeline runs.
    setTimeout(() => {
      runAnalysis()
      setIsAnalyzing(false)
      setStep(3)
    }, 0)
  }

  const canAnalyze = parsedFiles.length > 0 && parsedFiles.every((f) => fileMappings[f.id])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Confirm your data</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          We detected the dataset type and column mappings for each file. Only uncertain mappings need your review.
        </p>
      </div>

      {erroredFiles.length > 0 && (
        <Card className="border-danger-500/30 bg-danger-50 px-4 py-3 text-sm text-danger-800 dark:bg-danger-500/5 dark:text-danger-300">
          {erroredFiles.length} file{erroredFiles.length > 1 ? 's' : ''} couldn't be read and will be skipped: {erroredFiles.map((f) => f.filename).join(', ')}. Go back to remove or replace them.
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {parsedFiles.map((file) => {
          const mapping = fileMappings[file.id]
          if (!mapping) return null
          return (
            <FileConfirmCard
              key={file.id}
              file={file}
              mapping={mapping}
              onMappingChange={setFileMapping}
              onDatasetKindChange={(kind) => handleDatasetKindChange(file.id, kind)}
            />
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <Button variant="secondary" onClick={() => setStep(1)}>
          ← Back
        </Button>
        <Button onClick={handleAnalyze} disabled={isAnalyzing || !canAnalyze}>
          {isAnalyzing ? 'Analyzing…' : 'Analyze'}
        </Button>
      </div>
    </div>
  )
}
