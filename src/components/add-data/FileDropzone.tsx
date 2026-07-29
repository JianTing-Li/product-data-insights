import { useRef, useState, type DragEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { cn } from '@/lib/cn'

interface FileDropzoneProps {
  onFiles: (files: File[]) => void
}

export function FileDropzone({ onFiles }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) onFiles(files)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop CSV files here, or activate to browse for files"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-200',
        isDragOver
          ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
          : 'border-neutral-300 bg-white hover:border-accent-400 hover:bg-accent-50/40 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-accent-600',
      )}
    >
      <UploadCloud className="h-8 w-8 text-neutral-400" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
          Drag and drop CSV files here
        </p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          or click to browse — product, sales, and inventory files are all supported
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length > 0) onFiles(files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
