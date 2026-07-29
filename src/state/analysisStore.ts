import { create } from 'zustand'
import type { AddedFile, AnalysisResult, FileMapping, SignalId } from '@/lib/processing/types'

export type Step = 1 | 2 | 3

export interface ProductFilters {
  search: string
  category: string | null
  attentionType: SignalId | 'all'
}

const defaultFilters: ProductFilters = {
  search: '',
  category: null,
  attentionType: 'all',
}

interface AnalysisState {
  step: Step
  files: AddedFile[]
  fileMappings: Record<string, FileMapping>
  analysis: AnalysisResult | null
  periodLength: 7 | 30
  chartMetric: 'revenue' | 'orders' | 'units'
  filters: ProductFilters
  isAnalyzing: boolean

  setStep: (step: Step) => void
  addFiles: (files: AddedFile[]) => void
  updateFile: (id: string, patch: Partial<AddedFile>) => void
  removeFile: (id: string) => void
  setFileMapping: (mapping: FileMapping) => void
  setAnalysis: (result: AnalysisResult) => void
  setIsAnalyzing: (value: boolean) => void
  setPeriodLength: (length: 7 | 30) => void
  setChartMetric: (metric: 'revenue' | 'orders' | 'units') => void
  setFilters: (patch: Partial<ProductFilters>) => void
  clearFilters: () => void
  reset: () => void
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  step: 1,
  files: [],
  fileMappings: {},
  analysis: null,
  periodLength: 7,
  chartMetric: 'revenue',
  filters: defaultFilters,
  isAnalyzing: false,

  setStep: (step) => set({ step }),
  addFiles: (files) => set((state) => ({ files: [...state.files, ...files] })),
  updateFile: (id, patch) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),
  removeFile: (id) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.fileMappings
      return {
        files: state.files.filter((f) => f.id !== id),
        fileMappings: rest,
      }
    }),
  setFileMapping: (mapping) =>
    set((state) => ({
      fileMappings: { ...state.fileMappings, [mapping.fileId]: mapping },
    })),
  setAnalysis: (result) => set({ analysis: result }),
  setIsAnalyzing: (value) => set({ isAnalyzing: value }),
  setPeriodLength: (length) => set({ periodLength: length }),
  setChartMetric: (metric) => set({ chartMetric: metric }),
  setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  clearFilters: () => set({ filters: defaultFilters }),
  reset: () =>
    set({
      step: 1,
      files: [],
      fileMappings: {},
      analysis: null,
      periodLength: 7,
      chartMetric: 'revenue',
      filters: defaultFilters,
      isAnalyzing: false,
    }),
}))
