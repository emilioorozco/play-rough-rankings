import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useMemo } from 'react'
import { z } from 'zod'
import { storageConfigs } from './persistence-config'

// Base form draft interface
interface BaseFormDraft {
  id: string
  formType: string
  data: Record<string, any>
  currentStep?: number
  totalSteps?: number
  lastUpdated: Date
  isDirty: boolean
  isValid: boolean
  errors: Record<string, string>
  metadata?: Record<string, any>
}

// Extended form draft interface for different form types
interface ExtendedFormDraft extends BaseFormDraft {
  // Form-specific metadata
  userId?: string
  sessionId?: string
  formVersion?: string
  
  // Auto-save settings
  autoSaveEnabled?: boolean
  autoSaveInterval?: number // milliseconds
  
  // Validation settings
  validationSchema?: string // Schema identifier
  validationErrors?: Record<string, string[]>
  
  // UI state
  isSubmitting?: boolean
  isAutoSaving?: boolean
  lastAutoSaved?: Date
  
  // Validation UX state
  touchedFields?: Record<string, boolean>
  submitAttempted?: boolean
  
  // Form lifecycle
  createdAt?: Date
  expiresAt?: Date
  isExpired?: boolean
  
  // Form context
  context?: {
    tournamentId?: string
    userId?: string
    page?: string
    referrer?: string
  }
}

// Form draft metadata for organization
interface FormDraftMetadata {
  formId?: string
  formType: string
  displayName: string
  description?: string
  category: 'tournament' | 'user' | 'system' | 'communication' | 'other'
  maxDrafts?: number
  autoExpire?: boolean
  expireAfter?: number // milliseconds
  validationSchema?: z.ZodSchema<any>
  steps?: string[]
  requiredFields?: string[]
  optionalFields?: string[]
}

// Store state interface
interface FormDraftState {
  // Draft storage
  drafts: Record<string, ExtendedFormDraft>
  
  // Draft metadata
  metadata: Record<string, FormDraftMetadata>
  
  // Current active draft
  activeDraftId: string | null
  
  // Auto-save settings
  autoSaveSettings: {
    enabled: boolean
    interval: number
    maxRetries: number
    retryDelay: number
  }
  
  // Loading states
  loading: {
    saving: boolean
    loading: boolean
    autoSaving: boolean
    deleting: boolean
    submitting: boolean
    validating: boolean
  }
  
  // Error states
  errors: {
    save: string | null
    load: string | null
    delete: string | null
    autoSave: string | null
    submit: string | null
    validation: string | null
  }
  
  // Actions for draft management
  createDraft: (formType: string, initialData: Record<string, any>, metadata?: Partial<FormDraftMetadata>) => string
  updateDraft: (draftId: string, updates: Partial<ExtendedFormDraft>) => void
  updateDraftData: (draftId: string, data: Record<string, any>) => void
  updateDraftStep: (draftId: string, step: number) => void
  deleteDraft: (draftId: string) => void
  clearDrafts: (formType?: string) => void
  
  // Actions for active draft
  setActiveDraft: (draftId: string | null) => void
  getActiveDraft: () => ExtendedFormDraft | null
  
  // Actions for draft retrieval
  getDraft: (draftId: string) => ExtendedFormDraft | null
  getDraftsByType: (formType: string) => ExtendedFormDraft[]
  getDraftsByUser: (userId: string) => ExtendedFormDraft[]
  getDraftsByContext: (context: Record<string, any>) => ExtendedFormDraft[]
  
  // Actions for validation
  validateDraft: (draftId: string) => { isValid: boolean; errors: Record<string, string> }
  validateDraftData: (formType: string, data: Record<string, any>) => { isValid: boolean; errors: Record<string, string> }
  
  // Actions for touched field tracking
  markFieldTouched: (draftId: string, field: string) => void
  markSubmitAttempted: (draftId: string) => void
  resetTouchedState: (draftId: string) => void
  
  // Actions for enhanced form management
  saveDraft: (formId: string, data: any) => void
  loadDraft: (formId: string) => any | null
  clearDraft: (formId: string) => void
  hasDraft: (formId: string) => boolean
  getDraftLastSaved: (formId: string) => Date | null
  
  // Actions for auto-save
  enableAutoSave: (draftId: string, interval?: number) => void
  disableAutoSave: (draftId: string) => void
  autoSaveDraft: (draftId: string) => Promise<void>
  
  // Actions for draft lifecycle
  markDraftAsDirty: (draftId: string) => void
  markDraftAsClean: (draftId: string) => void
  expireDraft: (draftId: string) => void
  cleanupExpiredDrafts: () => void
  
  // Actions for loading states
  setLoading: (key: keyof FormDraftState['loading'], isLoading: boolean) => void
  
  // Actions for error states
  setError: (key: keyof FormDraftState['errors'], error: string | null) => void
  clearError: (key: keyof FormDraftState['errors']) => void
  clearAllErrors: () => void
  
  // Actions for form submission
  setSubmitting: (draftId: string, isSubmitting: boolean) => void
  setValidationErrors: (draftId: string, errors: Record<string, string>) => void
  clearValidationErrors: (draftId: string) => void
  
  // Actions for metadata
  setDraftMetadata: (formType: string, metadata: FormDraftMetadata) => void
  getDraftMetadata: (formType: string) => FormDraftMetadata | null
  
  // Utility actions
  exportDraft: (draftId: string) => string
  importDraft: (draftData: string) => string
  duplicateDraft: (draftId: string, newFormType?: string) => string
  
  // Store management
  resetStore: () => void
}

// Default auto-save settings
const defaultAutoSaveSettings = {
  enabled: true,
  interval: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
}

// Default form draft metadata
const defaultFormDraftMetadata: Record<string, FormDraftMetadata> = {
  'tournament-create': {
    formType: 'tournament-create',
    displayName: 'Tournament Creation',
    description: 'Draft for creating new tournaments',
    category: 'tournament',
    maxDrafts: 5,
    autoExpire: true,
    expireAfter: 7 * 24 * 60 * 60 * 1000, // 7 days
    steps: ['basic-info', 'description', 'details', 'settings', 'confirmation'],
    requiredFields: ['name', 'gameId', 'storeId', 'date'],
    optionalFields: ['description', 'rules', 'contactInfo'],
  },
  'tournament-registration': {
    formType: 'tournament-registration',
    displayName: 'Tournament Registration',
    description: 'Draft for tournament registration',
    category: 'tournament',
    maxDrafts: 3,
    autoExpire: true,
    expireAfter: 24 * 60 * 60 * 1000, // 24 hours
    requiredFields: ['tournamentId'],
    optionalFields: ['deckInfo', 'notes'],
  },
  'user-preferences': {
    formType: 'user-preferences',
    displayName: 'User Preferences',
    description: 'Draft for user preference settings',
    category: 'user',
    maxDrafts: 1,
    autoExpire: true,
    expireAfter: 30 * 24 * 60 * 60 * 1000, // 30 days
    requiredFields: [],
    optionalFields: ['nameDisplayPreference', 'profileVisibility', 'optInCommunications', 'optInTournamentUpdates', 'optInLeaderboardUpdates', 'optInMarketing'],
  },
  'profile-completion': {
    formType: 'profile-completion',
    displayName: 'Profile Completion',
    description: 'Draft for completing user profile information',
    category: 'user',
    maxDrafts: 1,
    autoExpire: true,
    expireAfter: 7 * 24 * 60 * 60 * 1000, // 7 days
    requiredFields: ['firstName', 'lastName', 'favoriteGame'],
    optionalFields: ['location'],
  },
  'profile-update': {
    formType: 'profile-update',
    displayName: 'Profile Update',
    description: 'Draft for updating user profile information',
    category: 'user',
    maxDrafts: 1,
    autoExpire: true,
    expireAfter: 7 * 24 * 60 * 60 * 1000, // 7 days
    requiredFields: ['firstName', 'lastName'],
    optionalFields: ['bio', 'location', 'website', 'socialLinks'],
  },
  'contact-form': {
    formType: 'contact-form',
    displayName: 'Contact Form',
    description: 'Draft for contact form submissions',
    category: 'communication',
    maxDrafts: 3,
    autoExpire: true,
    expireAfter: 24 * 60 * 60 * 1000, // 24 hours
    requiredFields: ['name', 'email', 'subject', 'message'],
    optionalFields: [],
  },
  'feedback-form': {
    formType: 'feedback-form',
    displayName: 'Feedback Form',
    description: 'Draft for feedback submissions',
    category: 'communication',
    maxDrafts: 5,
    autoExpire: true,
    expireAfter: 7 * 24 * 60 * 60 * 1000, // 7 days
    requiredFields: ['type', 'title', 'description'],
    optionalFields: ['priority'],
  },
  'user-registration': {
    formType: 'user-registration',
    displayName: 'User Registration',
    description: 'Draft for user registration forms',
    category: 'user',
    maxDrafts: 1,
    autoExpire: true,
    expireAfter: 24 * 60 * 60 * 1000, // 24 hours
    steps: ['personal-info', 'account-info', 'preferences'],
    requiredFields: ['email', 'password', 'username', 'firstName', 'lastName', 'agreeToTerms'],
    optionalFields: ['subscribeToUpdates', 'optInCommunications', 'nameDisplayPreference'],
  },
  'store-create': {
    formType: 'store-create',
    displayName: 'Store Creation',
    description: 'Draft for creating new stores',
    category: 'system',
    maxDrafts: 3,
    autoExpire: true,
    expireAfter: 2 * 60 * 60 * 1000, // 2 hours
    requiredFields: ['name', 'address', 'city', 'state', 'zipCode'],
    optionalFields: ['contactEmail', 'website', 'isActive'],
  },
}

export const useFormDraftStore = create<FormDraftState>()(
  persist(
    (set, get) => ({
      // Initial state
      drafts: {},
      metadata: { ...defaultFormDraftMetadata },
      activeDraftId: null,
      autoSaveSettings: { ...defaultAutoSaveSettings },
      loading: {
        saving: false,
        loading: false,
        autoSaving: false,
        deleting: false,
        submitting: false,
        validating: false,
      },
      errors: {
        save: null,
        load: null,
        delete: null,
        autoSave: null,
        submit: null,
        validation: null,
      },
      
      // Draft management actions
      createDraft: (formType: string, initialData: Record<string, any>, metadata?: Partial<FormDraftMetadata>) => {
        const draftId = `${formType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const now = new Date()
        
        const draft: ExtendedFormDraft = {
          id: draftId,
          formType,
          data: { ...initialData },
          currentStep: 0,
          totalSteps: metadata?.steps?.length || 1,
          lastUpdated: now,
          isDirty: false,
          isValid: false,
          errors: {},
          metadata: metadata || {},
          autoSaveEnabled: true,
          autoSaveInterval: 30000,
          createdAt: now,
          expiresAt: metadata?.autoExpire ? new Date(now.getTime() + (metadata.expireAfter || 7 * 24 * 60 * 60 * 1000)) : undefined,
          isExpired: false,
          touchedFields: {},
          submitAttempted: false,
        }
        
        set((state: FormDraftState) => ({
          drafts: {
            ...state.drafts,
            [draftId]: draft,
          },
          activeDraftId: draftId,
        }))
        
        return draftId
      },
      
      updateDraft: (draftId: string, updates: Partial<ExtendedFormDraft>) => {
        set((state: FormDraftState) => {
          const draft = state.drafts[draftId]
          if (!draft) return state
          
          return {
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...draft,
                ...updates,
                lastUpdated: new Date(),
                isDirty: true,
              },
            },
          }
        })
      },
      
      updateDraftData: (draftId: string, data: Record<string, any>) => {
        set((state: FormDraftState) => {
          const draft = state.drafts[draftId]
          if (!draft) {
            return state
          }
          
          // Update the data
          const updatedData = { ...draft.data, ...data }
          
          // Validate the updated data
          const validation = get().validateDraftData(draft.formType, updatedData)
          
          return {
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...draft,
                data: updatedData,
                lastUpdated: new Date(),
                isDirty: true,
                isValid: validation.isValid,
                errors: validation.errors,
              },
            },
          }
        })
      },
      
      updateDraftStep: (draftId: string, step: number) => {
        set((state: FormDraftState) => {
          const draft = state.drafts[draftId]
          if (!draft) return state
          
          return {
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...draft,
                currentStep: step,
                lastUpdated: new Date(),
                isDirty: true,
              },
            },
          }
        })
      },
      
      deleteDraft: (draftId: string) => {
        set((state: FormDraftState) => {
          const newDrafts = { ...state.drafts }
          delete newDrafts[draftId]
          
          return {
            drafts: newDrafts,
            activeDraftId: state.activeDraftId === draftId ? null : state.activeDraftId,
          }
        })
      },
      
      clearDrafts: (formType?: string) => {
        set((state: FormDraftState) => {
          if (formType) {
            const newDrafts = { ...state.drafts }
            Object.keys(newDrafts).forEach(key => {
              if (newDrafts[key].formType === formType) {
                delete newDrafts[key]
              }
            })
            return { drafts: newDrafts }
          } else {
            return { drafts: {} }
          }
        })
      },
      
      // Active draft actions
      setActiveDraft: (draftId: string | null) => {
        set({ activeDraftId: draftId })
      },
      
      getActiveDraft: (): ExtendedFormDraft | null => {
        const state = get()
        return state.activeDraftId ? state.drafts[state.activeDraftId] || null : null
      },
      
      // Draft retrieval actions
      getDraft: (draftId: string): ExtendedFormDraft | null => {
        const state = get()
        return state.drafts[draftId] || null
      },
      
      getDraftsByType: (formType: string): ExtendedFormDraft[] => {
        const state = get()
        return (Object.values(state.drafts) as ExtendedFormDraft[]).filter(draft => draft.formType === formType)
      },
      
      getDraftsByUser: (userId: string): ExtendedFormDraft[] => {
        const state = get()
        return (Object.values(state.drafts) as ExtendedFormDraft[]).filter(draft => draft.userId === userId)
      },
      
      getDraftsByContext: (context: Record<string, any>): ExtendedFormDraft[] => {
        const state = get()
        return (Object.values(state.drafts) as ExtendedFormDraft[]).filter(draft => {
          if (!draft.context) return false
          return Object.keys(context).every((key) => (draft.context as Record<string, any>)?.[key] === (context as Record<string, any>)[key])
        })
      },
      
      // Validation actions
      validateDraft: (draftId: string) => {
        const state = get()
        const draft = state.drafts[draftId]
        if (!draft) return { isValid: false, errors: {} }
        
        const metadata = state.metadata[draft.formType]
        if (!metadata) return { isValid: true, errors: {} }
        
        const validation = get().validateDraftData(draft.formType, draft.data)
        
        // Update the draft with validation results
        set((state: FormDraftState) => {
          const currentDraft = state.drafts[draftId]
          if (!currentDraft) return state
          
          return {
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...currentDraft,
                isValid: validation.isValid,
                errors: validation.errors,
              },
            },
          }
        })
        
        return validation
      },
      
      validateDraftData: (formType: string, data: Record<string, any>) => {
        const state = get()
        const metadata = state.metadata[formType]
        
        if (!metadata || !metadata.validationSchema) {
          return { isValid: true, errors: {} }
        }
        
        try {
          metadata.validationSchema.parse(data)
          return { isValid: true, errors: {} }
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errors: Record<string, string> = {}
            error.issues.forEach(issue => {
              const field = issue.path[0] as string
              if (field) {
                errors[field] = issue.message
              }
            })
            return { isValid: false, errors }
          }
          return { isValid: false, errors: { general: 'Validation failed' } }
        }
      },
      
      // Touched field tracking actions (pure Zustand pattern - no get() calls)
      markFieldTouched: (draftId: string, field: string) => {
        set((state: FormDraftState) => {
          const draft = state.drafts[draftId]
          if (!draft) return state
          
          return {
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...draft,
                touchedFields: {
                  ...draft.touchedFields,
                  [field]: true,
                },
                lastUpdated: new Date(),
              },
            },
          }
        })
      },
      
      markSubmitAttempted: (draftId: string) => {
        set((state: FormDraftState) => {
          const draft = state.drafts[draftId]
          if (!draft) return state
          
          return {
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...draft,
                submitAttempted: true,
                lastUpdated: new Date(),
              },
            },
          }
        })
      },
      
      resetTouchedState: (draftId: string) => {
        set((state: FormDraftState) => {
          const draft = state.drafts[draftId]
          if (!draft) return state
          
          return {
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...draft,
                touchedFields: {},
                submitAttempted: false,
                lastUpdated: new Date(),
              },
            },
          }
        })
      },
      
      // Auto-save actions
      enableAutoSave: (draftId: string, interval?: number) => {
        set((state: FormDraftState) => {
          const draft = state.drafts[draftId]
          if (!draft) return state
          
          return {
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...draft,
                autoSaveEnabled: true,
                autoSaveInterval: interval || state.autoSaveSettings.interval,
              },
            },
          }
        })
      },
      
      disableAutoSave: (draftId: string) => {
        set((state: FormDraftState) => {
          const draft = state.drafts[draftId]
          if (!draft) return state
          
          return {
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...draft,
                autoSaveEnabled: false,
              },
            },
          }
        })
      },
      
      autoSaveDraft: async (draftId: string) => {
        const state = get()
        const draft = state.drafts[draftId]
        if (!draft || !draft.autoSaveEnabled) return
        
        set((state: FormDraftState) => ({
          loading: { ...state.loading, autoSaving: true },
          errors: { ...state.errors, autoSave: null },
        }))
        
        try {
          // Simulate auto-save (in real implementation, this would save to server)
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          set((state: FormDraftState) => ({
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...state.drafts[draftId],
                lastAutoSaved: new Date(),
                isDirty: false,
              },
            },
            loading: { ...state.loading, autoSaving: false },
          }))
        } catch (error) {
          set((state: FormDraftState) => ({
            loading: { ...state.loading, autoSaving: false },
            errors: { ...state.errors, autoSave: error instanceof Error ? error.message : 'Auto-save failed' },
          }))
        }
      },
      
      // Draft lifecycle actions
      markDraftAsDirty: (draftId: string) => {
        set((state: FormDraftState) => {
          const draft = state.drafts[draftId]
          if (!draft) return state
          
          return {
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...draft,
                isDirty: true,
                lastUpdated: new Date(),
              },
            },
          }
        })
      },
      
      markDraftAsClean: (draftId: string) => {
        set((state: FormDraftState) => {
          const draft = state.drafts[draftId]
          if (!draft) return state
          
          return {
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...draft,
                isDirty: false,
                lastUpdated: new Date(),
              },
            },
          }
        })
      },
      
      expireDraft: (draftId: string) => {
        set((state: FormDraftState) => {
          const draft = state.drafts[draftId]
          if (!draft) return state
          
          return {
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...draft,
                isExpired: true,
                lastUpdated: new Date(),
              },
            },
          }
        })
      },
      
      cleanupExpiredDrafts: () => {
        set((state: FormDraftState) => {
          const now = new Date()
          const newDrafts = { ...state.drafts }
          
          Object.keys(newDrafts).forEach((key: string) => {
            const draft = newDrafts[key] as ExtendedFormDraft
            if (draft.expiresAt && draft.expiresAt < now) {
              delete newDrafts[key]
            }
          })
          
          return { drafts: newDrafts }
        })
      },
      
      // Loading actions
      setLoading: (key: keyof FormDraftState['loading'], isLoading: boolean) => {
        set((state: FormDraftState) => ({
          loading: {
            ...state.loading,
            [key]: isLoading,
          },
        }))
      },
      
      // Error actions
      setError: (key: keyof FormDraftState['errors'], error: string | null) => {
        set((state: FormDraftState) => ({
          errors: {
            ...state.errors,
            [key]: error,
          },
        }))
      },
      
      clearError: (key: keyof FormDraftState['errors']) => {
        set((state: FormDraftState) => ({
          errors: {
            ...state.errors,
            [key]: null,
          },
        }))
      },
      
      clearAllErrors: () => {
        set({
          errors: {
            save: null,
            load: null,
            delete: null,
            autoSave: null,
            submit: null,
            validation: null,
          },
        })
      },
      
      // Form submission actions
      setSubmitting: (draftId: string, isSubmitting: boolean) => {
        set((state: FormDraftState) => ({
          drafts: {
            ...state.drafts,
            [draftId]: {
              ...state.drafts[draftId],
              isSubmitting,
            },
          },
          loading: {
            ...state.loading,
            submitting: isSubmitting,
          },
        }))
      },
      
      setValidationErrors: (draftId: string, errors: Record<string, string>) => {
        set((state: FormDraftState) => ({
          drafts: {
            ...state.drafts,
            [draftId]: {
              ...state.drafts[draftId],
              errors,
            },
          },
          errors: {
            ...state.errors,
            validation: Object.keys(errors).length > 0 ? 'Validation errors present' : null,
          },
        }))
      },
      
      clearValidationErrors: (draftId: string) => {
        set((state: FormDraftState) => ({
          drafts: {
            ...state.drafts,
            [draftId]: {
              ...state.drafts[draftId],
              errors: {},
            },
          },
          errors: {
            ...state.errors,
            validation: null,
          },
        }))
      },
      
      // Metadata actions
      setDraftMetadata: (formType: string, metadata: FormDraftMetadata) => {
        set((state: FormDraftState) => ({
          metadata: {
            ...state.metadata,
            [formType]: metadata,
          },
        }))
      },
      
      getDraftMetadata: (formType: string) => {
        const state = get()
        return state.metadata[formType] || null
      },
      
      // Utility actions
      exportDraft: (draftId: string) => {
        const state = get()
        const draft = state.drafts[draftId]
        if (!draft) return ''
        
        return JSON.stringify(draft, null, 2)
      },
      
      importDraft: (draftData: string) => {
        try {
          const draft = JSON.parse(draftData) as ExtendedFormDraft
          const draftId = `${draft.formType}-imported-${Date.now()}`
          
          set((state: FormDraftState) => ({
            drafts: {
              ...state.drafts,
              [draftId]: {
                ...draft,
                id: draftId,
                lastUpdated: new Date(),
              },
            },
          }))
          
          return draftId
        } catch (_error) {
          throw new Error('Invalid draft data')
        }
      },
      
      duplicateDraft: (draftId: string, newFormType?: string) => {
        const state = get()
        const draft = state.drafts[draftId]
        if (!draft) throw new Error('Draft not found')
        
        const newDraftId = get().createDraft(
          newFormType || draft.formType,
          draft.data,
          state.metadata[draft.formType]
        )
        
        return newDraftId
      },
      
      // Enhanced form management functions
      saveDraft: (formId: string, data: any) => {
        const allDrafts = Object.values(get().drafts)
        
        const existingDraft = allDrafts.find(
          (draft: any) => draft.metadata?.formId === formId
        ) as ExtendedFormDraft | undefined
        
        if (existingDraft) {
          // Update existing draft
          get().updateDraftData(existingDraft.id, data)
        } else {
          // Create new draft
          get().createDraft('enhanced-form', data, {
            formId,
            displayName: 'Enhanced Form',
            description: 'Auto-saved form data',
            category: 'system',
            maxDrafts: 1,
            autoExpire: true,
            expireAfter: 24 * 60 * 60 * 1000, // 24 hours
          })
        }
      },
      
      loadDraft: (formId: string) => {
        const draft = Object.values(get().drafts).find(
          (draft: any) => draft.metadata?.formId === formId
        )
        return (draft as any)?.data || null
      },
      
      clearDraft: (formId: string) => {
        const draft = Object.values(get().drafts).find(
          (draft: any) => draft.metadata?.formId === formId
        )
        if (draft) {
          get().deleteDraft((draft as ExtendedFormDraft).id)
        }
      },
      
      hasDraft: (formId: string) => {
        const draft = Object.values(get().drafts).find(
          (draft: any) => draft.metadata?.formId === formId
        )
        return !!draft
      },
      
      getDraftLastSaved: (formId: string) => {
        const draft = Object.values(get().drafts).find(
          (draft: any) => draft.metadata?.formId === formId
        )
        return (draft as any)?.lastUpdated || null
      },
      
      // Store management
      resetStore: () => {
        set({
          drafts: {},
          activeDraftId: null,
          loading: {
            saving: false,
            loading: false,
            autoSaving: false,
            deleting: false,
            submitting: false,
            validating: false,
          },
          errors: {
            save: null,
            load: null,
            delete: null,
            autoSave: null,
            submit: null,
            validation: null,
          },
        })
      },
    }),
    {
      name: storageConfigs.formDrafts.name,
      storage: createJSONStorage(() => storageConfigs.formDrafts.storage),
      partialize: storageConfigs.formDrafts.partialize,
      onRehydrateStorage: storageConfigs.formDrafts.onRehydrateStorage,
      migrate: (persistedState: any, version: number) => {
        // Handle migration between different versions of the stored state
        if (version === 0) {
          // Migrate from version 0 to version 1
          return {
            ...persistedState,
            version: 1,
            // Ensure all required fields exist with defaults
            drafts: persistedState.drafts || {},
            metadata: persistedState.metadata || { ...defaultFormDraftMetadata },
            activeDraftId: persistedState.activeDraftId || null,
            autoSaveSettings: persistedState.autoSaveSettings || { ...defaultAutoSaveSettings },
            loading: persistedState.loading || {
              saving: false,
              loading: false,
              autoSaving: false,
              deleting: false,
            },
            errors: persistedState.errors || {
              save: null,
              load: null,
              delete: null,
              autoSave: null,
            },
          }
        }
        
        // For future versions, add migration logic here
        return persistedState
      },
      version: 1,
    }
  )
)

// Memoized selectors for better performance
export const useFormDraft = (draftId: string) => {
  const draft = useFormDraftStore((state) => state.drafts[draftId])
  const updateDraft = useFormDraftStore((state) => state.updateDraft)
  const updateDraftData = useFormDraftStore((state) => state.updateDraftData)
  const updateDraftStep = useFormDraftStore((state) => state.updateDraftStep)
  const deleteDraft = useFormDraftStore((state) => state.deleteDraft)
  const validateDraft = useFormDraftStore((state) => state.validateDraft)
  
  return useMemo(() => ({
    draft,
    updateDraft: (updates: Partial<ExtendedFormDraft>) => updateDraft(draftId, updates),
    updateData: (data: Record<string, any>) => updateDraftData(draftId, data),
    updateStep: (step: number) => updateDraftStep(draftId, step),
    delete: () => deleteDraft(draftId),
    validate: () => validateDraft(draftId),
    exists: !!draft,
  }), [draft, updateDraft, updateDraftData, updateDraftStep, deleteDraft, validateDraft, draftId])
}

export const useFormDraftsByType = (formType: string) => {
  const drafts = useFormDraftStore((state) => state.getDraftsByType(formType))
  const createDraft = useFormDraftStore((state) => state.createDraft)
  const clearDrafts = useFormDraftStore((state) => state.clearDrafts)
  const metadata = useFormDraftStore((state) => state.metadata[formType])
  
  return useMemo(() => ({
    drafts,
    createDraft: (initialData: Record<string, any>) => createDraft(formType, initialData, metadata),
    clearDrafts: () => clearDrafts(formType),
    metadata,
    count: drafts.length,
  }), [drafts, createDraft, clearDrafts, formType, metadata])
}

export const useActiveFormDraft = () => {
  const activeDraftId = useFormDraftStore((state) => state.activeDraftId)
  const activeDraft = useFormDraftStore((state) => state.getActiveDraft())
  const setActiveDraft = useFormDraftStore((state) => state.setActiveDraft)
  
  return useMemo(() => ({
    draftId: activeDraftId,
    draft: activeDraft,
    setActiveDraft,
    hasActiveDraft: !!activeDraft,
  }), [activeDraftId, activeDraft, setActiveDraft])
}

export const useFormDraftLoading = () => {
  const loading = useFormDraftStore((state) => state.loading)
  const setLoading = useFormDraftStore((state) => state.setLoading)
  
  return useMemo(() => ({
    ...loading,
    setLoading,
    isAnyLoading: Object.values(loading).some(Boolean),
  }), [loading, setLoading])
}

export const useFormDraftErrors = () => {
  const errors = useFormDraftStore((state) => state.errors)
  const setError = useFormDraftStore((state) => state.setError)
  const clearError = useFormDraftStore((state) => state.clearError)
  const clearAllErrors = useFormDraftStore((state) => state.clearAllErrors)
  
  return useMemo(() => ({
    ...errors,
    setError,
    clearError,
    clearAllErrors,
    hasAnyError: Object.values(errors).some(Boolean),
  }), [errors, setError, clearError, clearAllErrors])
}

export const useFormDraftAutoSave = () => {
  const autoSaveSettings = useFormDraftStore((state) => state.autoSaveSettings)
  const enableAutoSave = useFormDraftStore((state) => state.enableAutoSave)
  const disableAutoSave = useFormDraftStore((state) => state.disableAutoSave)
  const autoSaveDraft = useFormDraftStore((state) => state.autoSaveDraft)
  
  return useMemo(() => ({
    settings: autoSaveSettings,
    enable: (draftId: string, interval?: number) => enableAutoSave(draftId, interval),
    disable: (draftId: string) => disableAutoSave(draftId),
    save: (draftId: string) => autoSaveDraft(draftId),
  }), [autoSaveSettings, enableAutoSave, disableAutoSave, autoSaveDraft])
}

export const useFormDraftMetadata = () => {
  const metadata = useFormDraftStore((state) => state.metadata)
  const setDraftMetadata = useFormDraftStore((state) => state.setDraftMetadata)
  const getDraftMetadata = useFormDraftStore((state) => state.getDraftMetadata)
  
  return useMemo(() => ({
    metadata,
    setMetadata: (formType: string, metadata: FormDraftMetadata) => setDraftMetadata(formType, metadata),
    getMetadata: (formType: string) => getDraftMetadata(formType),
  }), [metadata, setDraftMetadata, getDraftMetadata])
}

// Utility hook for form draft operations
export const useFormDraftOperations = () => {
  const exportDraft = useFormDraftStore((state) => state.exportDraft)
  const importDraft = useFormDraftStore((state) => state.importDraft)
  const duplicateDraft = useFormDraftStore((state) => state.duplicateDraft)
  const cleanupExpiredDrafts = useFormDraftStore((state) => state.cleanupExpiredDrafts)
  const resetStore = useFormDraftStore((state) => state.resetStore)
  
  return useMemo(() => ({
    exportDraft,
    importDraft,
    duplicateDraft,
    cleanupExpiredDrafts,
    resetStore,
  }), [exportDraft, importDraft, duplicateDraft, cleanupExpiredDrafts, resetStore])
}

// Export types for use in components
export type { 
  BaseFormDraft, 
  ExtendedFormDraft, 
  FormDraftMetadata, 
  FormDraftState 
}
