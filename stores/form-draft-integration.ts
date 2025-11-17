import { useFormDraftStore } from './form-draft-store'
import { useLoadingStore } from './loading-store'
import { useUIStore } from './ui-store'
import { useAuthStore } from './auth-store'
import { useCallback } from 'react'
import { z } from 'zod'

// Enhanced form management hook that integrates multiple stores
export const useFormDraftIntegration = (formId: string, formType: string, validationSchema?: any) => {
  // Form draft store
  const {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    createDraft,
    setSubmitting,
    setValidationErrors,
    clearValidationErrors,
    updateDraftData,
    validateDraftData,
  } = useFormDraftStore()

  // Subscribe to drafts map reactively so UI updates when draft data changes
  const allDrafts = useFormDraftStore((state) => state.drafts)

  // Resolve the actual draft by metadata.formId if present
  const resolvedDraft = (Object.values(allDrafts) as any[]).find(
    (d: any) => d?.metadata?.formId === formId
  ) as any
  

  // Loading store for global loading states
  const {
    setLoading,
    setError,
    clearError,
    loading,
    errors,
  } = useLoadingStore()

  // UI store for modal management
  const {
    openModal,
    closeModal,
  } = useUIStore()

  // Get current draft data with defaults
  const draft = resolvedDraft || null
  const defaultFormData = {
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: '',
    agreeToTerms: false,
    subscribeToUpdates: false,
    nameDisplayPreference: 'DISPLAY_NAME',
    optInCommunications: false,
  }
  const formData = draft?.data || defaultFormData
  const draftErrors = draft?.errors || {}
  const isDirty = draft?.isDirty || false
  const lastSaved = draft?.lastUpdated ? new Date(draft.lastUpdated) : undefined
  const isSubmitting = draft?.isSubmitting || false

  // Enhanced save draft with loading integration
  const saveDraftWithLoading = useCallback(async (data: any) => {
    const key = `draft-save-${formId}`
    setLoading(key, true)
    clearError(key)

    try {
      saveDraft(formId, data)
      setLoading(key, false)
    } catch (error) {
      setError(key, error instanceof Error ? error.message : 'Failed to save draft')
      setLoading(key, false)
      throw error
    }
  }, [formId, saveDraft, setLoading, setError, clearError])

  // Enhanced submit with loading and error integration
  const submitWithLoading = useCallback(async (submitFn: () => Promise<void>) => {
    const key = `form-submit-${formId}`
    setSubmitting(formId, true)
    setLoading(key, true)
    clearError(key)
    clearValidationErrors(formId)

    try {
      await submitFn()
      setSubmitting(formId, false)
      setLoading(key, false)
    } catch (error) {
      setSubmitting(formId, false)
      setLoading(key, false)
      setError(key, error instanceof Error ? error.message : 'Submission failed')
      throw error
    }
  }, [formId, setSubmitting, setLoading, setError, clearError, clearValidationErrors])

  // Enhanced validation with error integration
  const validateWithErrors = useCallback((data: any) => {
    let validation
    
    if (validationSchema) {
      // Use provided validation schema
      try {
        validationSchema.parse(data)
        validation = { isValid: true, errors: {} }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {}
          error.issues.forEach(issue => {
            const field = issue.path[0] as string
            if (field) {
              errors[field] = issue.message
            }
          })
          validation = { isValid: false, errors }
        } else {
          validation = { isValid: false, errors: { general: 'Validation failed' } }
        }
      }
    } else {
      // Fall back to store validation
      validation = validateDraftData(formType, data)
    }
    
    if (!validation.isValid) {
      setValidationErrors(formId, validation.errors)
      setError(`validation-${formId}`, 'Validation failed')
    } else {
      clearValidationErrors(formId)
      clearError(`validation-${formId}`)
    }
    return validation
  }, [formId, formType, validationSchema, validateDraftData, setValidationErrors, clearValidationErrors, setError, clearError])

  // Check if user has permission to access this form
  const hasFormPermission = useCallback((_requiredRole?: string) => {
    // This would need to be enhanced with actual user context
    return true // Placeholder
  }, [])

  // Modal integration helpers
  const openFormModal = useCallback((modalName: string, config?: any) => {
    openModal(modalName as any, config)
  }, [openModal])

  const closeFormModal = useCallback((modalName: string) => {
    closeModal(modalName as any)
  }, [closeModal])

  return {
    // Form data
    formData,
    draftErrors,
    isDirty,
    lastSaved,
    isSubmitting,
    
    // Enhanced actions
    saveDraft: saveDraftWithLoading,
    submit: submitWithLoading,
    validate: validateWithErrors,
    
    // Basic actions
    loadDraft: () => loadDraft(formId),
    clearDraft: () => clearDraft(formId),
    hasDraft: () => hasDraft(formId),
    createDraft: (initialData: any) => createDraft(formType, initialData),
    updateField: (field: string, value: any) => {
      
      // Ensure draft exists before updating
      let targetDraftId = resolvedDraft?.id as string | undefined
      if (!targetDraftId) {
        const initialData = {
          email: '',
          password: '',
          confirmPassword: '',
          username: '',
          firstName: '',
          lastName: '',
          agreeToTerms: false,
          subscribeToUpdates: false,
          nameDisplayPreference: 'DISPLAY_NAME',
          optInCommunications: false,
        }
        // Use the store's createDraft directly since we need to pass formType
        const store = useFormDraftStore.getState()
        const baseMetadata = (store.metadata as any)[formType] || {}
        const storeCreateDraft = store.createDraft
        const newId = storeCreateDraft(formType, initialData, { ...baseMetadata, formId })
        targetDraftId = newId
        
      }
      
      const newData = { ...formData, [field]: value }
      if (targetDraftId) {
        
        updateDraftData(targetDraftId, newData)
      } else {
        // Fallback to enhanced save by formId
        
        saveDraft(formId, newData)
      }
    },
    
    // Loading states
    isLoading: loading[`draft-save-${formId}`] || false,
    isSubmittingLoading: loading[`form-submit-${formId}`] || false,
    
    // Error states
    saveError: errors[`draft-save-${formId}`],
    submitError: errors[`form-submit-${formId}`],
    validationError: errors[`validation-${formId}`],
    
    // Permission helpers
    hasFormPermission,
    
    // Modal helpers
    openFormModal,
    closeFormModal,
  }
}

// Hook for form components that need modal integration
export const useFormModalIntegration = (modalName: string) => {
  const { openModal, closeModal, modals } = useUIStore()
  const { setLoading, setError, clearError, loading, errors } = useLoadingStore()

  const modalState = modals[modalName as keyof typeof modals]
  const isOpen = modalState?.isOpen || false

  const openWithLoading = useCallback(async (config?: any) => {
    const key = `modal-${modalName}`
    setLoading(key, true)
    clearError(key)

    try {
      openModal(modalName as any, config)
      setLoading(key, false)
    } catch (error) {
      setError(key, error instanceof Error ? error.message : 'Failed to open modal')
      setLoading(key, false)
      throw error
    }
  }, [modalName, openModal, setLoading, setError, clearError])

  const closeWithLoading = useCallback(async () => {
    const key = `modal-${modalName}`
    setLoading(key, true)
    clearError(key)

    try {
      closeModal(modalName as any)
      setLoading(key, false)
    } catch (error) {
      setError(key, error instanceof Error ? error.message : 'Failed to close modal')
      setLoading(key, false)
      throw error
    }
  }, [modalName, closeModal, setLoading, setError, clearError])

  return {
    isOpen,
    open: openWithLoading,
    close: closeWithLoading,
    isLoading: loading[`modal-${modalName}`] || false,
    error: errors[`modal-${modalName}`],
  }
}

// Hook for form components that need user context
export const useFormUserIntegration = () => {
  const { hasRole, hasAnyRole, getUserRoleLevel } = useAuthStore()

  const canAccessForm = useCallback((formType: string, requiredRole?: string) => {
    if (!requiredRole) return true
    
    // Define role requirements for different form types
    const formRoleRequirements: Record<string, string> = {
      'tournament-create': 'organizer',
      'store-create': 'admin',
      'user-registration': 'player', // Anyone can register
      'profile-update': 'player',
      'user-preferences': 'player',
    }

    const role = formRoleRequirements[formType] || requiredRole
    return hasRole(undefined, role as any) // This would need actual user context
  }, [hasRole])

  const canSubmitForm = useCallback((formType: string) => {
    return canAccessForm(formType)
  }, [canAccessForm])

  return {
    canAccessForm,
    canSubmitForm,
    hasRole,
    hasAnyRole,
    getUserRoleLevel,
  }
}
