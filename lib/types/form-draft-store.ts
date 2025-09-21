// Form Draft Store specific types

export interface BaseFormDraft {
  id: string
  formType: string
  formData: Record<string, any>
  lastUpdated: Date
  expiresAt?: Date
  isSubmitted: boolean
  submittedAt?: Date
}

export interface ExtendedFormDraft extends BaseFormDraft {
  metadata: {
    userId?: string
    sessionId?: string
    userAgent?: string
    ipAddress?: string
    version: number
  }
  validation: {
    isValid: boolean
    errors: Record<string, string[]>
    warnings: Record<string, string[]>
  }
  history: {
    versions: Array<{
      timestamp: Date
      data: Record<string, any>
      changes: string[]
    }>
    maxVersions: number
  }
}

export interface FormDraftMetadata {
  formType: string
  displayName: string
  description?: string
  version: number
  expireAfter: number
  maxVersions: number
  autoSave: boolean
  autoSaveInterval: number
  validation: {
    schema?: any
    rules?: Record<string, any>
  }
}

export interface AutoSaveSettings {
  enabled: boolean
  interval: number
  debounce: number
  maxRetries: number
  retryDelay: number
}

export interface FormDraftState {
  drafts: Record<string, ExtendedFormDraft>
  metadata: Record<string, FormDraftMetadata>
  autoSaveSettings: AutoSaveSettings
  lastUpdated: Date
  version: number
}

export interface FormDraftActions {
  saveDraft: (draftId: string, formData: any, formType: string, metadata?: any) => void
  updateDraft: (draftId: string, updates: Partial<ExtendedFormDraft>) => void
  deleteDraft: (draftId: string) => void
  clearDraft: (draftId: string) => void
  clearDrafts: (formType?: string) => void
  clearExpiredDrafts: () => void
  extendDraft: (draftId: string, additionalTime?: number) => void
  markDraftAsSubmitted: (draftId: string) => void
  setAutoSaveSettings: (settings: Partial<AutoSaveSettings>) => void
  enableAutoSave: () => void
  disableAutoSave: () => void
  setAutoSaveInterval: (interval: number) => void
  resetAllDrafts: () => void
}

export type FormDraftStore = FormDraftState & FormDraftActions

// Hook return types
export interface UseFormDraftReturn {
  draft: ExtendedFormDraft | null
  save: (formData: any, formType: string, metadata?: any) => void
  update: (updates: Partial<ExtendedFormDraft>) => void
  delete: () => void
  clear: () => void
}

export interface UseFormDraftsReturn {
  drafts: ExtendedFormDraft[]
  save: (draftId: string, formData: any, formType: string, metadata?: any) => void
  update: (draftId: string, updates: Partial<ExtendedFormDraft>) => void
  delete: (draftId: string) => void
  clear: (formType?: string) => void
  clearExpired: () => void
}

export interface UseAutoSaveReturn {
  settings: AutoSaveSettings
  set: (settings: Partial<AutoSaveSettings>) => void
  enable: () => void
  disable: () => void
  setInterval: (interval: number) => void
}

export interface UseDraftLifecycleReturn {
  draft: ExtendedFormDraft | null
  isExpired: boolean
  timeUntilExpiry: number
  extend: (additionalTime?: number) => void
  markSubmitted: () => void
}

export interface UseFormDraftMetadataReturn {
  metadata: Record<string, FormDraftMetadata>
  autoSaveSettings: AutoSaveSettings
  lastUpdated: Date
  version: number
}

export interface UseDraftStatisticsReturn {
  totalDrafts: number
  draftsByType: Record<string, number>
  expiredDrafts: number
  activeDrafts: number
}

export interface UseFormDraftStoreActionsReturn {
  saveDraft: (draftId: string, formData: any, formType: string, metadata?: any) => void
  updateDraft: (draftId: string, updates: Partial<ExtendedFormDraft>) => void
  deleteDraft: (draftId: string) => void
  clearDraft: (draftId: string) => void
  clearDrafts: (formType?: string) => void
  clearExpiredDrafts: () => void
  extendDraft: (draftId: string, additionalTime?: number) => void
  markDraftAsSubmitted: (draftId: string) => void
  setAutoSaveSettings: (settings: Partial<AutoSaveSettings>) => void
  enableAutoSave: () => void
  disableAutoSave: () => void
  setAutoSaveInterval: (interval: number) => void
  resetAllDrafts: () => void
}

export interface UseFormDraftStoreStateReturn {
  allDrafts: Record<string, ExtendedFormDraft>
  metadata: Record<string, FormDraftMetadata>
  autoSaveSettings: AutoSaveSettings
  lastUpdated: Date
  version: number
  statistics: UseDraftStatisticsReturn
}
