import { useState, useCallback, useMemo } from 'react'
import { z } from 'zod'
import { useLoadingBar } from '@/stores/loading-store'

interface FormState<T> {
  data: T
  errors: Record<keyof T, string>
  isSubmitting: boolean
  isDirty: boolean
  isValid: boolean
}

interface UseFormStateOptions<T> {
  initialData: T
  validationSchema?: z.ZodSchema<T>
  onSubmit: (data: T) => Promise<void> | void
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  showLoadingBar?: boolean
  resetOnSuccess?: boolean
  loadingDelay?: number // Delay in milliseconds to show loading state for better UX
}

export function useFormState<T extends Record<string, any>>({
  initialData,
  validationSchema,
  onSubmit,
  onSuccess,
  onError,
  showLoadingBar = true,
  resetOnSuccess = false,
  loadingDelay = 1000, // Default 1 second delay for better UX
}: UseFormStateOptions<T>) {
  const { showLoadingBar: showGlobalLoadingBar, hideLoadingBar: hideGlobalLoadingBar } = useLoadingBar()
  
  // Memoize initialData to prevent unnecessary re-renders
  const memoizedInitialData = useMemo(() => initialData, [JSON.stringify(initialData)])
  
  const [data, setData] = useState<T>(memoizedInitialData)
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Validate form data
  const validationResult = useMemo(() => {
    if (!validationSchema) return { success: true, data, errors: {} }
    
    try {
      const validatedData = validationSchema.parse(data)
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
        return { success: false, data, errors: fieldErrors }
      }
      return { success: false, data, errors: {} }
    }
  }, [data, validationSchema])

  const isValid = validationResult.success

  // Update field value
  const setField = useCallback((field: keyof T, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
    
    // Clear field error when user starts typing
    setErrors(prev => {
      if (prev[field]) {
        return { ...prev, [field]: '' }
      }
      return prev
    })
  }, [])

  // Update multiple fields
  const setFields = useCallback((updates: Partial<T>) => {
    setData(prev => ({ ...prev, ...updates }))
    setIsDirty(true)
    
    // Clear errors for updated fields
    setErrors(prev => {
      const clearedErrors = { ...prev }
      let hasChanges = false
      
      Object.keys(updates).forEach(key => {
        if (clearedErrors[key as keyof T]) {
          clearedErrors[key as keyof T] = ''
          hasChanges = true
        }
      })
      
      return hasChanges ? clearedErrors : prev
    })
  }, [])

  // Set field error
  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [])

  // Set multiple errors
  const setMultipleErrors = useCallback((newErrors: Record<keyof T, string>) => {
    setErrors(newErrors)
  }, [])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({} as Record<keyof T, string>)
  }, [])

  // Reset form to initial state
  const reset = useCallback(() => {
    setData(memoizedInitialData)
    setErrors({} as Record<keyof T, string>)
    setIsDirty(false)
    setIsSubmitting(false)
  }, [memoizedInitialData])

  // Submit form
  const submit = useCallback(async () => {
    if (!isValid) {
      // Set validation errors
      setMultipleErrors(validationResult.errors as Record<keyof T, string>)
      return
    }

    setIsSubmitting(true)
    
    if (showLoadingBar) {
      showGlobalLoadingBar()
    }

    try {
      await onSubmit(validationResult.data)
      
      // Add loading delay for better UX if specified
      if (loadingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, loadingDelay))
      }
      
      onSuccess?.(validationResult.data)
      
      if (resetOnSuccess) {
        reset()
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err)
    } finally {
      setIsSubmitting(false)
      if (showLoadingBar) {
        hideGlobalLoadingBar()
      }
    }
  }, [isValid, validationResult, onSubmit, onSuccess, onError, showLoadingBar, showGlobalLoadingBar, resetOnSuccess, reset, setMultipleErrors, loadingDelay])

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    submit()
  }, [submit])

  return {
    // State
    data,
    errors,
    isSubmitting,
    isDirty,
    isValid,
    
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

// Hook for managing form steps (multi-step forms)
export function useFormSteps<T extends Record<string, any>>({
  steps,
  initialData,
  validationSchemas,
  onSubmit,
  onSuccess,
  onError,
  showLoadingBar = true,
  loadingDelay = 1000, // Default 1 second delay for better UX
}: {
  steps: string[]
  initialData: T
  validationSchemas?: Record<string, z.ZodSchema<any>>
  onSubmit: (data: T) => Promise<void> | void
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  showLoadingBar?: boolean
  loadingDelay?: number // Delay in milliseconds to show loading state for better UX
}) {
  const [currentStep, setCurrentStep] = useState(0)
  
  // Memoize initialData to prevent unnecessary re-renders
  const memoizedInitialData = useMemo(() => initialData, [JSON.stringify(initialData)])
  
  // Use a single form state that persists across all steps
  const formState = useFormState({
    initialData: memoizedInitialData,
    validationSchema: validationSchemas?.[steps[currentStep]],
    onSubmit: async (data) => {
      // Only submit on the final step
      if (currentStep === steps.length - 1) {
        await onSubmit(data)
        // After successful submission, advance to success step if it exists
        // Note: The success step is typically the last step, so we don't advance here
      }
    },
    onSuccess,
    onError,
    showLoadingBar,
    loadingDelay,
  })

  const goToNextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep, steps.length])

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step)
    }
  }, [steps.length])

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  // Custom submit function that handles step logic
  const submit = useCallback(async () => {
    if (isLastStep) {
      // On the final step, submit the form (this includes loading delay)
      await formState.submit()
    } else {
      // On intermediate steps, just advance to next step
      goToNextStep()
    }
  }, [isLastStep, formState.submit, goToNextStep])

  return {
    ...formState,
    currentStep,
    currentStepName: steps[currentStep],
    isFirstStep,
    isLastStep,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    submit, // Override the form's submit with our custom one
  }
}
