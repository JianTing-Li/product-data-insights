import { useState } from 'react'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { FileDropzone } from './FileDropzone'
import { FileListItem } from './FileListItem'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAnalysisStore } from '@/state/analysisStore'
import { ingestFile } from '@/lib/processing/ingestFile'
import { loadSampleFiles, type SampleDataKind } from '@/data/sampleFiles'

export function AddDataStep() {
  const files = useAnalysisStore((s) => s.files)
  const addFiles = useAnalysisStore((s) => s.addFiles)
  const removeFile = useAnalysisStore((s) => s.removeFile)
  const setStep = useAnalysisStore((s) => s.setStep)
  const [loadingSample, setLoadingSample] = useState<SampleDataKind | null>(null)

  async function handleFiles(fileList: File[]) {
    const parsed = await Promise.all(fileList.map((f) => ingestFile(f, 'upload')))
    addFiles(parsed)
  }

  async function handleUseSampleData(kind: SampleDataKind) {
    setLoadingSample(kind)
    try {
      const sample = await loadSampleFiles(kind)
      addFiles(sample)
    } finally {
      setLoadingSample(null)
    }
  }

  const canContinue = files.some((f) => f.status === 'parsed')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Add your data</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Add product, sales, and inventory CSV files. You can add one or more of each.
        </p>
      </div>

      <Card className="flex items-start gap-3 border-accent-200 bg-accent-50/60 px-4 py-3 dark:border-accent-900 dark:bg-accent-900/10">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-600 dark:text-accent-300" aria-hidden="true" />
        <p className="text-sm text-accent-900 dark:text-accent-200">
          Your files are processed locally in your browser and are not uploaded.
        </p>
      </Card>

      <FileDropzone onFiles={handleFiles} />

      <div className="flex items-center justify-center gap-3">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">or try sample data</span>
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => handleUseSampleData('full')}
            disabled={loadingSample !== null}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {loadingSample === 'full' ? 'Loading…' : 'Full analysis sample'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleUseSampleData('catalog-only')}
            disabled={loadingSample !== null}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {loadingSample === 'catalog-only' ? 'Loading…' : 'Amazon catalog only'}
          </Button>
        </div>
        <p className="max-w-md text-center text-xs text-neutral-500 dark:text-neutral-400">
          Both use real Amazon product data. The full sample adds illustrative sales and inventory
          numbers so you can see the complete dashboard; the catalog-only sample is unmodified real
          data with no invented numbers.
        </p>
      </div>

      {files.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Added files ({files.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {files.map((file) => (
              <FileListItem key={file.id} file={file} onRemove={removeFile} />
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <Button disabled={!canContinue} onClick={() => setStep(2)}>
          Continue to confirm data
        </Button>
      </div>
    </div>
  )
}
