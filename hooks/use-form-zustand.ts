import { z } from 'zod'
import { useDraftByFormId, useDraftIdByFormId, useFormDraftActions, useDraftDataByFormId, useDraftErrorsByFormId, useIsDraftDirtyByFormId, useDraftTouchedFieldsByFormId, useDraftSubmitAttemptedByFormId } from '@/stores/form-draft-store-selectors'
import { useLoadingActions } from '@/stores/loading-store-selectors'
import { useCallback, useMemo, useRef } from 'react'
import React from 'react'
import { transformError, extractFieldErrors, logError, type TransformedError } from '@/lib/utils/error-transformer'

// Validation cache entry
interface ValidationCacheEntry {
  value: any
  error: string | null
  timestamp: number
}

// Validation cache structure
interface ValidationCache {
  [field: string]: ValidationCacheEntry
}

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
  
  // Validation timing configuration
  validationTiming?: 'blur' | 'submit' | 'change'
  validationDebounce?: number
  errorTransformer?: (error: any) => { field?: string; message: string }
  errorMessages?: Record<string, string>
}

/**
 * Zustand-based form state hook that replaces useFormState
 * Uses the existing form draft store instead of React useState/useEffect
 * Enhanced with validation timing, blur tracking, and server error handling
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
  validationTiming = 'blur',
  validationDebounce = 300,
  errorTransformer: customErrorTransformer,
  errorMessages,
}: UseZustandFormOptions<T>) {
  const actions = useFormDraftActions()
  const loadingActions = useLoadingActions()
  
  // Validation cache - persists across renders but not across component unmounts
  const validationCacheRef = useRef<ValidationCache>({})
  
  // Track validation schema version to invalidate cache when schema changes
  const validationSchemaVersionRef = useRef<number>(0)
  
  // Get or create draft using formId-based selectors
  const draft = useDraftByFormId(formId)
  const draftId = useDraftIdByFormId(formId)
  const draftData = useDraftDataByFormId(formId) as T || initialData
  const errors = useDraftErrorsByFormId(formId)
  const isDirty = useIsDraftDirtyByFormId(formId)
  const touchedFields = useDraftTouchedFieldsByFormId(formId)
  const submitAttempted = useDraftSubmitAttemptedByFormId(formId)
  // const isValid = useIsDraftValid(formId) // Not used in current implementation
  
  // Get validation timing from draft
  const currentValidationTiming = draft?.validationTiming || validationTiming
  
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
        validationTiming, // Set validation timing on initialization
      })
    }
  }, [draft, formId, formType, initialData, actions, userId, sessionId, enableAutoSave, autoSaveDelay, validationTiming])
  
  // Validate current data (client-side validation)
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
            // Apply custom error messages if provided
            fieldErrors[field] = errorMessages?.[field as string] || err.message
          }
        })
        return { success: false, data: draftData, errors: fieldErrors }
      }
      return { success: false, data: draftData, errors: {} }
    }
  }, [draftData, validationSchema, errorMessages])
  
  // Track previous validation errors to detect changes
  const prevValidationErrorsRef = useRef<Record<string, string>>({})
  
  // Update client errors in draft when validation changes (not on every draft update)
  React.useEffect(() => {
    if (!draftId) return
    
    const newClientErrors = validationResult.errors as Record<string, string>
    const prevClientErrors = prevValidationErrorsRef.current
    
    // Check if validation errors actually changed
    const errorsChanged = 
      JSON.stringify(newClientErrors) !== JSON.stringify(prevClientErrors)
    
    if (!errorsChanged) return
    
    // Update ref with new errors
    prevValidationErrorsRef.current = newClientErrors
    
    // Update client errors in store
    Object.keys(newClientErrors).forEach(field => {
      actions.setClientError(draftId, field, newClientErrors[field])
    })
    
    // Clear client errors that are no longer present
    Object.keys(prevClientErrors).forEach(field => {
      if (!newClientErrors[field]) {
        actions.clearClientError(draftId, field)
      }
    })
    
    // Update isValid based on validation result
    if (draft) {
      const serverErrors = draft.serverErrors || {}
      const hasErrors = Object.keys(newClientErrors).length > 0 || Object.keys(serverErrors).length > 0
      if (draft.isValid === hasErrors) {
        actions.updateDraft(draftId, { isValid: !hasErrors })
      }
    }
  }, [draftId, validationResult.errors, actions, draft])
  
  // Separate client and server errors
  const clientErrors = useMemo(() => {
    return (draft?.clientErrors || {}) as Record<keyof T, string>
  }, [draft?.clientErrors])
  
  const serverErrors = useMemo(() => {
    return (draft?.serverErrors || {}) as Record<keyof T, string>
  }, [draft?.serverErrors])
  
  // Compute display errors based on validation timing mode
  const displayErrors = useMemo(() => {
    const allClientErrors = clientErrors
    const allServerErrors = serverErrors
    const blurredFields = draft?.blurredFields || {}
    
    // Server errors always take priority and are always shown
    const result: Record<string, string> = { ...allServerErrors }
    
    // Determine which client errors to show based on validation timing
    if (currentValidationTiming === 'blur') {
      // Show errors only for blurred fields or after submit attempt
      if (submitAttempted) {
        // After submit, show all client errors
        Object.assign(result, allClientErrors)
      } else {
        // Before submit, only show errors for blurred fields
        Object.keys(allClientErrors).forEach((key) => {
          if (blurredFields[key]) {
            result[key] = allClientErrors[key]
          }
        })
      }
    } else if (currentValidationTiming === 'submit') {
      // Show errors only after submit attempt
      if (submitAttempted) {
        Object.assign(result, allClientErrors)
      }
    } else {
      // 'change' mode: show errors for touched fields (current behavior)
      if (submitAttempted) {
        Object.assign(result, allClientErrors)
      } else {
        Object.keys(allClientErrors).forEach((key) => {
          if (touchedFields[key]) {
            result[key] = allClientErrors[key]
          }
        })
      }
    }
    
    return result as Record<keyof T, string>
  }, [clientErrors, serverErrors, currentValidationTiming, submitAttempted, touchedFields, draft?.blurredFields])
  
  // Invalidate validation cache when schema changes
  React.useEffect(() => {
    validationSchemaVersionRef.current += 1
    validationCacheRef.current = {} // Clear cache on schema change
  }, [validationSchema])
  
  // Check validation cache for a field
  const checkValidationCache = useCallback((field: keyof T, value: any): string | null | undefined => {
    const fieldKey = field as string
    const cacheEntry = validationCacheRef.current[fieldKey]
    
    if (!cacheEntry) return undefined // Cache miss
    
    // Check if value matches (deep equality for objects/arrays)
    const valueMatches = JSON.stringify(cacheEntry.value) === JSON.stringify(value)
    
    if (!valueMatches) return undefined // Cache miss - value changed
    
    // Cache hit - return cached error (null means no error)
    return cacheEntry.error
  }, [])
  
  // Update validation cache for a field
  const updateValidationCache = useCallback((field: keyof T, value: any, error: string | null) => {
    const fieldKey = field as string
    validationCacheRef.current[fieldKey] = {
      value,
      error,
      timestamp: Date.now(),
    }
  }, [])
  
  // Track latest validation request to handle race conditions
  const latestValidationRequestRef = useRef<Record<string, number>>({})
  
  // Validate a single field asynchronously (prevents UI blocking)
  const validateFieldAsync = useCallback(async (field: keyof T, value: any): Promise<string | null> => {
    if (!validationSchema) return null
    
    // Check cache first
    const cachedResult = checkValidationCache(field, value)
    if (cachedResult !== undefined) {
      return cachedResult // Return cached result (null or error string)
    }
    
    // Generate request ID for race condition handling
    const requestId = Date.now()
    const fieldKey = field as string
    latestValidationRequestRef.current[fieldKey] = requestId
    
    // Wrap validation in Promise with setTimeout to prevent UI blocking
    return new Promise((resolve) => {
      setTimeout(() => {
        // Check if this is still the latest validation request
        if (latestValidationRequestRef.current[fieldKey] !== requestId) {
          // A newer validation request has been made, discard this result
          return
        }
        
        try {
          // Create a partial schema for just this field
          const fieldData = { [field]: value }
          validationSchema.parse({ ...draftData, ...fieldData })
          
          // Cache the successful validation
          updateValidationCache(field, value, null)
          resolve(null) // No error
        } catch (error) {
          if (error instanceof z.ZodError) {
            const fieldError = error.issues.find(issue => issue.path[0] === field)
            if (fieldError) {
              const errorMessage = errorMessages?.[field as string] || fieldError.message
              // Cache the validation error
              updateValidationCache(field, value, errorMessage)
              resolve(errorMessage)
              return
            }
          }
          resolve(null)
        }
      }, 0) // Use setTimeout with 0 to defer to next event loop tick
    })
  }, [validationSchema, draftData, errorMessages, checkValidationCache, updateValidationCache])
  
  // Handle blur event with async validation
  const handleBlur = useCallback(async (field: keyof T) => {
    if (!draftId) return
    
    // Mark field as blurred
    actions.markFieldBlurred(draftId, field as string)
    
    // If validation timing is 'blur', validate the field asynchronously
    if (currentValidationTiming === 'blur') {
      const fieldValue = draftData[field]
      const error = await validateFieldAsync(field, fieldValue)
      
      if (error) {
        actions.setClientError(draftId, field as string, error)
      } else {
        actions.clearClientError(draftId, field as string)
      }
    }
  }, [draftId, actions, currentValidationTiming, draftData, validateFieldAsync])
  
  // Check if field is blurred
  const isFieldBlurred = useCallback((field: keyof T): boolean => {
    if (!draftId) return false
    return actions.isFieldBlurred(draftId, field as string)
  }, [draftId, actions])
  
  // Update field value with debouncing for 'change' mode
  const setField = useCallback((field: keyof T, value: any) => {
    const currentData = actions.loadDraft(formId) || initialData
    const updatedData = { ...currentData, [field]: value }
    actions.saveDraft(formId, updatedData)
    
    // Mark field as touched when user interacts with it (use draftId if available)
    if (draftId) {
      actions.markFieldTouched(draftId, field as string)
    }
    
    // Clear server error when user starts typing
    if (draftId && serverErrors[field]) {
      actions.clearServerError(draftId, field as string)
    }
    
    // Handle validation based on timing mode
    if (draftId && currentValidationTiming === 'change') {
      // Clear existing debounce timer
      actions.clearDebounceTimer(draftId, field as string)
      
      // Set up debounced async validation
      if (validationDebounce > 0) {
        const timer = setTimeout(async () => {
          const error = await validateFieldAsync(field, value)
          if (error) {
            actions.setClientError(draftId, field as string, error)
          } else {
            actions.clearClientError(draftId, field as string)
          }
        }, validationDebounce)
        
        actions.setDebounceTimer(draftId, field as string, timer)
      } else {
        // No debounce, validate asynchronously
        validateFieldAsync(field, value).then((error) => {
          if (error) {
            actions.setClientError(draftId, field as string, error)
          } else {
            actions.clearClientError(draftId, field as string)
          }
        })
      }
    }
  }, [formId, draftId, actions, initialData, serverErrors, currentValidationTiming, validationDebounce, validateFieldAsync])
  
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
  
  // Set server error for a specific field
  const setServerError = useCallback((field: keyof T, error: string) => {
    if (draftId) {
      actions.setServerError(draftId, field as string, error)
    }
  }, [draftId, actions])
  
  // Clear all server errors
  const clearServerErrors = useCallback(() => {
    if (draftId) {
      actions.clearAllServerErrors(draftId)
    }
  }, [draftId, actions])
  
  // Submit form with error transformation
  const submit = useCallback(async () => {
    if (!draftId) {
      console.error('[useZustandForm] Cannot submit - no draftId resolved')
      return
    }
    
    // Mark that submit was attempted - this triggers showing all validation errors
    actions.markSubmitAttempted(draftId)
    
    // Clear previous server errors before new submission
    actions.clearAllServerErrors(draftId)
    
    if (!validationResult.success) {
      // Set client errors for display
      Object.entries(validationResult.errors).forEach(([field, error]) => {
        actions.setClientError(draftId, field, error as string)
      })
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
      // Log technical error details
      logError(error, `Form submission failed: ${formId}`)
      
      // Transform error using custom transformer or default
      let transformedError: TransformedError
      
      if (customErrorTransformer) {
        const customResult = customErrorTransformer(error)
        transformedError = {
          message: customResult.message,
          field: customResult.field,
          isFieldSpecific: !!customResult.field,
        }
      } else {
        transformedError = transformError(error)
      }
      
      // Extract field-specific errors
      const fieldErrors = extractFieldErrors(error)
      
      // Set field-specific errors as server errors
      if (Object.keys(fieldErrors).length > 0) {
        actions.setServerErrors(draftId, fieldErrors)
      } else if (transformedError.isFieldSpecific && transformedError.field) {
        // Single field error from transformed error
        actions.setServerError(draftId, transformedError.field, transformedError.message)
      } else {
        // Non-field-specific error - check if it's an authentication error
        const errorMessage = transformedError.message.toLowerCase()
        const isAuthError = errorMessage.includes('invalid email or password') ||
                           errorMessage.includes('invalid password') ||
                           errorMessage.includes('invalid credential') ||
                           (errorMessage.includes('invalid') && errorMessage.includes('credential'))
        
        if (isAuthError) {
          // Authentication errors should be shown at form level, not on specific fields
          // This prevents users from thinking only one field is wrong
          actions.setServerError(draftId, 'general', transformedError.message)
        } else {
          // For other non-field errors, try to assign to a sensible default field
          let defaultField: string | undefined
          const commonFields = ['email', 'name', 'username', 'title']
          for (const field of commonFields) {
            if (field in draftData) {
              defaultField = field
              break
            }
          }
          
          // Set error on default field if found, otherwise use 'general'
          if (defaultField) {
            actions.setServerError(draftId, defaultField, transformedError.message)
          } else {
            actions.setServerError(draftId, 'general', transformedError.message)
          }
        }
      }
      
      // Call onError with user-friendly error
      const err = new Error(transformedError.message)
      onError?.(err)
    } finally {
      actions.updateDraft(draftId, { isSubmitting: false })
      if (showLoadingBar) {
        loadingActions.hideLoadingBar()
      }
    }
  }, [
    draftId,
    formId,
    validationResult, 
    actions, 
    showLoadingBar, 
    loadingActions, 
    onSubmit, 
    onSuccess, 
    resetOnSuccess, 
    reset, 
    onError,
    customErrorTransformer,
    draftData
  ])
  
  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    submit()
  }, [submit])
  
  return {
    // State from Zustand store
    data: draftData,
    errors: displayErrors, // Use filtered errors for display (DEPRECATED: use displayErrors)
    displayErrors, // Computed errors based on validation timing
    clientErrors, // Client-side validation errors
    serverErrors, // Server-side errors
    isSubmitting: draft?.isSubmitting || false,
    isDirty: isDirty,
    isValid: validationResult.success, // Full validation for button disable logic
    
    // Auto-save state
    isAutoSaving: draft?.isAutoSaving || false,
    lastSaved: draft?.lastAutoSaved,
    hasUnsavedChanges: isDirty && !draft?.isAutoSaving,
    hasDraft: !!draft,
    
    // Validation timing state
    validationTiming: currentValidationTiming,
    
    // Actions
    setField,
    setFields,
    setFieldError,
    setMultipleErrors,
    clearErrors,
    reset,
    submit,
    handleSubmit,
    
    // Blur handling
    handleBlur,
    isFieldBlurred,
    
    // Server error handling
    setServerError,
    clearServerErrors,
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
 * Supports all validation timing and error transformation features
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
    // Pass through validation timing options
    validationTiming: options.validationTiming,
    validationDebounce: options.validationDebounce,
    errorTransformer: options.errorTransformer,
    errorMessages: options.errorMessages,
  })
}
