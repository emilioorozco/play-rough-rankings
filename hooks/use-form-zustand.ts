import { z } from 'zod'
import { useDraftByFormId, useDraftIdByFormId, useFormDraftActions, useDraftDataByFormId, useDraftErrorsByFormId, useIsDraftDirtyByFormId, useDraftTouchedFieldsByFormId, useDraftSubmitAttemptedByFormId } from '@/stores/form-draft-store-selectors'
import { useLoadingActions } from '@/stores/loading-store-selectors'
import { useCallback, useMemo, useEffect } from 'react'
import React from 'react'

interface UseZustandFormOptions<T> {
  formId: string
  formType: string
  initialData: T
  validationSchema?: z.ZodSchema<T>
  onSubmit: (data: T) => Promise<void> | void
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  showLoadingBar?: boolean
  resetOnSuccess?: boolean
  enableAutoSave?: boolean
  autoSaveDelay?: number
  userId?: string
  sessionId?: string
}

/**
 * Zustand-based form state hook that replaces useFormState
 * Uses the existing form draft store instead of React useState/useEffect
 */
export function useZustandForm<T extends Record<string, any>>({
  formId,
  formType,
  initialData,
  validationSchema,
  onSubmit,
  onSuccess,
  onError,
  showLoadingBar = true,
  resetOnSuccess = false,
  enableAutoSave = true,
  autoSaveDelay = 2000,
  userId,
  sessionId,
}: UseZustandFormOptions<T>) {
  const actions = useFormDraftActions()
  const loadingActions = useLoadingActions()
  
  // Get or create draft using formId-based selectors
  const draft = useDraftByFormId(formId)
  const draftId = useDraftIdByFormId(formId)
  const draftData = useDraftDataByFormId(formId) as T || initialData
  const errors = useDraftErrorsByFormId(formId)
  const isDirty = useIsDraftDirtyByFormId(formId)
  const touchedFields = useDraftTouchedFieldsByFormId(formId)
  const submitAttempted = useDraftSubmitAttemptedByFormId(formId)
  // const isValid = useIsDraftValid(formId) // Not used in current implementation
  
  // Initialize draft if it doesn't exist (use useEffect to avoid render-time side effects)
  React.useEffect(() => {
    if (!draft) {
      const newDraftId = actions.createDraft(formType, initialData, {
        formId, // CRITICAL: Pass formId in metadata so saveDraft can find it!
        formType,
        displayName: `Form ${formId}`,
        category: 'other',
        autoExpire: true,
        expireAfter: 24 * 60 * 60 * 1000, // 24 hours
      })
      // Use the newly created draftId for updateDraft
      actions.updateDraft(newDraftId, {
        userId,
        sessionId,
        autoSaveEnabled: enableAutoSave,
        autoSaveInterval: autoSaveDelay,
      })
    }
  }, [draft, formId, formType, initialData, actions, userId, sessionId, enableAutoSave, autoSaveDelay])
  
  // Validate current data
  const validationResult = useMemo(() => {
    if (!validationSchema) return { success: true, data: draftData, errors: {} }
    
    try {
      const validatedData = validationSchema.parse(draftData)
      return { success: true, data: validatedData, errors: {} }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = {} as Record<keyof T, string>
        error.issues.forEach((err: z.ZodIssue) => {
          const field = err.path[0] as keyof T
          if (field) {
            fieldErrors[field] = err.message
          }
        })
        return { success: false, data: draftData, errors: fieldErrors }
      }
      return { success: false, data: draftData, errors: {} }
    }
  }, [draftData, validationSchema])
  
  React.useEffect(() => {
    if (draft && draftId && validationResult.success !== draft.isValid) {
      actions.updateDraft(draftId, {
        isValid: validationResult.success,
        errors: validationResult.errors as Record<string, string>
      })
    }
  }, [draft, draftId, validationResult.success, validationResult.errors, actions])
  
  // Compute display errors - only show errors for touched fields OR after submit attempt
  const displayErrors = useMemo(() => {
    if (submitAttempted) {
      // After submit attempt, show all validation errors
      return validationResult.errors as Record<keyof T, string>
    }
    
    // Before submit, only show errors for touched fields
    const filtered: Record<string, string> = {}
    const errorObj = validationResult.errors as Record<string, string>
    Object.keys(errorObj).forEach((key) => {
      if (touchedFields[key]) {
        filtered[key] = errorObj[key]
      }
    })
    return filtered as Record<keyof T, string>
  }, [validationResult.errors, touchedFields, submitAttempted])
  
  // Update field value
  const setField = useCallback((field: keyof T, value: any) => {
    const currentData = actions.loadDraft(formId) || initialData
    const updatedData = { ...currentData, [field]: value }
    actions.saveDraft(formId, updatedData)
    
    // Mark field as touched when user interacts with it (use draftId if available)
    if (draftId) {
      actions.markFieldTouched(draftId, field as string)
    }
    
    // Clear field error when user starts typing
    if (draftId && errors[field as string]) {
      const clearedErrors = { ...errors }
      delete clearedErrors[field as string]
      actions.updateDraft(draftId, { errors: clearedErrors })
    }
  }, [formId, draftId, actions, initialData, errors])
  
  // Update multiple fields
  const setFields = useCallback((updates: Partial<T>) => {
    const currentData = actions.loadDraft(formId) || initialData
    const updatedData = { ...currentData, ...updates }
    actions.saveDraft(formId, updatedData)
    
    // Clear errors for updated fields
    if (draftId) {
      const clearedErrors = { ...errors }
      let hasChanges = false
      Object.keys(updates).forEach(key => {
        if (clearedErrors[key]) {
          delete clearedErrors[key]
          hasChanges = true
        }
      })
      
      if (hasChanges) {
        actions.updateDraft(draftId, { errors: clearedErrors })
      }
    }
  }, [formId, draftId, actions, initialData, errors])
  
  // Set field error
  const setFieldError = useCallback((field: keyof T, error: string) => {
    if (draftId) {
      const updatedErrors = { ...errors, [field as string]: error }
      actions.updateDraft(draftId, { errors: updatedErrors })
    }
  }, [draftId, actions, errors])
  
  // Set multiple errors
  const setMultipleErrors = useCallback((newErrors: Record<keyof T, string>) => {
    if (draftId) {
      actions.updateDraft(draftId, { errors: newErrors as Record<string, string> })
    }
  }, [draftId, actions])
  
  // Clear all errors
  const clearErrors = useCallback(() => {
    if (draftId) {
      actions.updateDraft(draftId, { errors: {} })
    }
  }, [draftId, actions])
  
  // Reset form to initial state
  const reset = useCallback(() => {
    if (draftId) {
      actions.saveDraft(formId, initialData)
      actions.updateDraft(draftId, { 
        errors: {},
        isDirty: false,
        isSubmitting: false 
      })
      actions.resetTouchedState(draftId)
    }
  }, [formId, draftId, actions, initialData])
  
  // Submit form
  const submit = useCallback(async () => {
    if (!draftId) {
      console.error('[useZustandForm] Cannot submit - no draftId resolved')
      return
    }
    
    // Mark that submit was attempted - this triggers showing all validation errors
    actions.markSubmitAttempted(draftId)
    
    if (!validationResult.success) {
      setMultipleErrors(validationResult.errors as Record<keyof T, string>)
      return
    }
    
    actions.updateDraft(draftId, { isSubmitting: true })
    
    if (showLoadingBar) {
      loadingActions.showLoadingBar()
    }
    
    try {
      await onSubmit(validationResult.data)
      onSuccess?.(validationResult.data)
      
      if (resetOnSuccess) {
        reset()
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err)
    } finally {
      actions.updateDraft(draftId, { isSubmitting: false })
      if (showLoadingBar) {
        loadingActions.hideLoadingBar()
      }
    }
  }, [
    draftId,
    validationResult, 
    setMultipleErrors, 
    actions, 
    showLoadingBar, 
    loadingActions, 
    onSubmit, 
    onSuccess, 
    resetOnSuccess, 
    reset, 
    onError
  ])
  
  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    submit()
  }, [submit])
  
  return {
    // State from Zustand store
    data: draftData,
    errors: displayErrors, // Use filtered errors for display
    isSubmitting: draft?.isSubmitting || false,
    isDirty: isDirty,
    isValid: validationResult.success, // Full validation for button disable logic
    
    // Auto-save state
    isAutoSaving: draft?.isAutoSaving || false,
    lastSaved: draft?.lastAutoSaved,
    hasUnsavedChanges: isDirty && !draft?.isAutoSaving,
    hasDraft: !!draft,
    
    // Actions
    setField,
    setFields,
    setFieldError,
    setMultipleErrors,
    clearErrors,
    reset,
    submit,
    handleSubmit,
  }
}

/**
 * Multi-step form hook using Zustand store
 */
interface UseZustandFormStepsOptions<T> extends UseZustandFormOptions<T> {
  steps: string[]
  validationSchemas?: Record<string, z.ZodSchema<any>>
}

export function useZustandFormSteps<T extends Record<string, any>>({
  steps,
  validationSchemas,
  ...baseOptions
}: UseZustandFormStepsOptions<T>) {
  const baseForm = useZustandForm(baseOptions)
  const actions = useFormDraftActions()
  const draft = useDraftByFormId(baseOptions.formId)
  const draftId = useDraftIdByFormId(baseOptions.formId)
  
  const currentStepIndex = draft?.currentStep || 0
  const currentStepName = steps[currentStepIndex]
  const totalSteps = steps.length
  
  // Update total steps in draft if different
  React.useEffect(() => {
    if (draft && draftId && draft.totalSteps !== totalSteps) {
      actions.updateDraft(draftId, { totalSteps })
    }
  }, [draft, draftId, totalSteps, actions])
  
  // Navigate between steps
  const goToStep = useCallback((stepIndex: number) => {
    if (draftId && stepIndex >= 0 && stepIndex < totalSteps) {
      actions.updateDraftStep(draftId, stepIndex)
    }
  }, [draftId, actions, totalSteps])
  
  const nextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      goToStep(currentStepIndex + 1)
    }
  }, [currentStepIndex, totalSteps, goToStep])
  
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1)
    }
  }, [currentStepIndex, goToStep])
  
  // Validate current step
  const currentStepSchema = validationSchemas?.[currentStepName]
  const isCurrentStepValid = useMemo(() => {
    if (!currentStepSchema) return true
    
    try {
      currentStepSchema.parse(baseForm.data)
      return true
    } catch {
      return false
    }
  }, [currentStepSchema, baseForm.data])
  
  const isLastStep = currentStepIndex === totalSteps - 1
  // Progress goes from 0% to ~90% across steps, only reaching 100% on final submission
  const optimisticProgress = isLastStep && baseForm.isSubmitting 
    ? 100 
    : Math.min((currentStepIndex / totalSteps) * 100 + (100 / totalSteps / 2), 90)
  
  return {
    ...baseForm,
    
    // Step-specific state
    currentStep: currentStepIndex,
    currentStepName,
    totalSteps,
    isFirstStep: currentStepIndex === 0,
    isLastStep,
    isCurrentStepValid,
    progress: optimisticProgress,
    
    // Step navigation
    goToStep,
    nextStep,
    prevStep,
  }
}

/**
 * Simple hook for forms that don't need draft persistence
 * Still uses Zustand for consistency but creates temporary drafts
 */
export function useSimpleZustandForm<T extends Record<string, any>>(
  options: Omit<UseZustandFormOptions<T>, 'formId' | 'formType' | 'enableAutoSave'>
) {
  // Create a temporary form ID
  const formId = useMemo(() => `temp-form-${Date.now()}`, [])
  
  return useZustandForm({
    ...options,
    formId,
    formType: 'temporary',
    enableAutoSave: false,
  })
}