import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { FileDropzone } from './FileDropzone'
import { FileListItem } from './FileListItem'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAnalysisStore } from '@/state/analysisStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { ingestFile } from '@/lib/processing/ingestFile'
import { loadSampleFiles, SAMPLE_COMPANIES, type SampleCompany } from '@/data/sampleFiles'

export function AddDataStep() {
  const files = useAnalysisStore((s) => s.files)
  const addFiles = useAnalysisStore((s) => s.addFiles)
  const removeFile = useAnalysisStore((s) => s.removeFile)
  const clearFiles = useAnalysisStore((s) => s.clearFiles)
  const setStep = useAnalysisStore((s) => s.setStep)
  const [loadingSample, setLoadingSample] = useState<SampleCompany | null>(null)
  const reducedMotion = useReducedMotion()

  async function handleFiles(fileList: File[]) {
    const parsed = await Promise.all(fileList.map((f) => ingestFile(f, 'upload')))
    addFiles(parsed)
  }

  async function handleUseSampleData(company: SampleCompany) {
    setLoadingSample(company)
    try {
      const sample = await loadSampleFiles(company)
      clearFiles()
      addFiles(sample)
    } finally {
      setLoadingSample(null)
    }
  }

  const canContinue = files.some((f) => f.status === 'parsed')
  const filenamesPreview =
    files.length > 3
      ? `${files
          .slice(0, 3)
          .map((f) => f.filename)
          .join(', ')}, +${files.length - 3} more`
      : files.map((f) => f.filename).join(', ')

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

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            key="added-files"
            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-success-500/30 bg-success-50 px-4 py-2.5 dark:border-success-500/20 dark:bg-success-500/10">
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600 dark:text-success-500" aria-hidden="true" />
                  <p className="min-w-0 truncate text-sm text-neutral-800 dark:text-neutral-100">
                    <span className="font-medium">
                      {files.length} file{files.length === 1 ? '' : 's'} added
                    </span>
                    {' · '}
                    {filenamesPreview}
                  </p>
                </div>
                <Button variant="secondary" size="sm" className="shrink-0" onClick={clearFiles}>
                  Clear files
                </Button>
              </div>

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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center gap-3">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />
        <span className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          or try sample data
        </span>
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="max-w-md text-center text-sm text-neutral-600 dark:text-neutral-400">
          Don't have files handy? Try a sample dataset from a real company.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Try sample data">
          {SAMPLE_COMPANIES.map((company) => (
            <Button
              key={company.value}
              data-testid={`sample-pill-${company.value}`}
              variant="secondary"
              size="sm"
              onClick={() => handleUseSampleData(company.value)}
              disabled={loadingSample !== null}
            >
              {loadingSample === company.value
                ? 'Loading…'
                : company.catalogOnly
                  ? `${company.label} (catalog only)`
                  : company.label}
            </Button>
          ))}
        </div>
        <p className="max-w-md text-center text-xs text-neutral-500 dark:text-neutral-400">
          Product catalog data in every sample is real. Walmart, Shopee, and Shein also include
          illustrative sales and inventory numbers so you can see the complete dashboard. Amazon's
          sample is the original file, unmodified — no sales or inventory data, so it shows the
          catalog-only view.
        </p>
      </div>

      <div className="flex justify-end border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <Button disabled={!canContinue} onClick={() => setStep(2)}>
          Continue to confirm data
        </Button>
      </div>
    </div>
  )
}
