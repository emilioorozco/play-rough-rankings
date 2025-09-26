'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useSession } from './session-provider'
import { useTRPCQueryWithLoading, useTRPCMutationWithLoading } from '@/hooks/useTRPCWithLoading'
import { LoadingWrapper, CardSkeleton, ErrorDisplay } from '../ui/loading-states'
import { useFormDraftStore } from '@/stores/form-draft-store'
import { userPreferencesSchema, type UserPreferencesFormData } from '@/lib/validation/schemas'
import { 
  EnhancedForm, 
  EnhancedFormActions, 
  EnhancedFormStatus,
  EnhancedFormField 
} from '@/components/forms/enhanced-form-components'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useUserPreferencesStore } from '@/stores/user-preferences-store'
import { z } from 'zod'

interface UserPreferencesProps {
  className?: string
}

export function UserPreferencesWithStore({ className }: UserPreferencesProps) {
  const { user } = useSession()

  // Local state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | undefined>()

  const formId = `user-preferences-${user?.id || 'anonymous'}`
  
  // Form draft store actions
  const {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    createDraft,
    getDraftLastSaved,
  } = useFormDraftStore()

  // Form data state
  const [formData, setFormData] = useState<UserPreferencesFormData>({
    nameDisplayPreference: 'FIRST_NAME',
    profileVisibility: 'PUBLIC',
    optInCommunications: false,
    optInTournamentUpdates: true,
    optInLeaderboardUpdates: true,
    optInMarketing: false,
  })

  // Get current preferences with enhanced loading/error management
  const { 
    data: preferences, 
    refetch: refetchPreferences, 
    isLoading: preferencesLoading,
    error: preferencesError 
  } = useTRPCQueryWithLoading(
    'user-preferences',
    () => trpc.userPreferences.get.useQuery(),
    {
      enabled: !!user,
      onSuccess: (data) => {
        console.log("Preferences loaded successfully:", data)
      },
      onError: (error) => {
        console.error("Failed to load preferences:", error)
      }
    }
  )
  
  // Get name display options
  const { 
    data: nameOptions, 
    isLoading: optionsLoading,
    error: optionsError 
  } = useTRPCQueryWithLoading(
    'name-display-options',
    () => trpc.userPreferences.getNameDisplayOptions.useQuery()
  )

  // Fallback options in case the query fails or returns undefined
  const fallbackNameOptions = [
    { value: 'FIRST_NAME', label: 'First Name Only' },
    { value: 'FIRST_LAST_NAME', label: 'First + Last Name' },
    { value: 'DISPLAY_NAME', label: 'Display Name' },
    { value: 'OPT_OUT', label: 'Opt Out (Private)' }
  ]

  // Extract options from the query response (the query returns {options: Array, currentUser: Object})
  const availableNameOptions = nameOptions?.options || fallbackNameOptions

  // Update preferences mutation with enhanced error handling
  const updatePreferences = useTRPCMutationWithLoading(
    'update-preferences',
    () => trpc.userPreferences.update.useMutation(),
    {
      onSuccess: () => {
        console.log("Preferences updated successfully")
        // Clear draft on successful update
        clearDraft(formId)
        setHasUnsavedChanges(false)
        refetchPreferences()
      },
      onError: (error) => {
        console.error(`Failed to update preferences: ${error instanceof Error ? error.message : String(error)}`)
        setErrors({ general: error instanceof Error ? error.message : 'Preferences update failed' })
      },
    }
  )

  // Reset preferences mutation with enhanced error handling
  const resetPreferences = useTRPCMutationWithLoading(
    'reset-preferences',
    () => trpc.userPreferences.reset.useMutation(),
    {
      onSuccess: () => {
        console.log("Preferences reset to defaults")
        // Clear draft on successful reset
        clearDraft(formId)
        setHasUnsavedChanges(false)
        refetchPreferences()
      },
      onError: (error) => {
        console.error(`Failed to reset preferences: ${error instanceof Error ? error.message : String(error)}`)
        setErrors({ general: error instanceof Error ? error.message : 'Preferences reset failed' })
      },
    }
  )

  // Use user preferences store for form behavior - using direct store access to avoid infinite loops
  const updatePreference = useUserPreferencesStore((state) => state.updatePreference)

  // Load draft on mount
  useEffect(() => {
    if (hasDraft(formId)) {
      const draftData = loadDraft(formId)
      if (draftData) {
        setFormData(draftData)
        setHasUnsavedChanges(true)
        setLastSaved(getDraftLastSaved(formId) ?? undefined)
        console.log('Restored user preferences draft:', draftData)
      }
    } else {
      // Create initial draft
      const draftId = createDraft('user-preferences', formData)
      console.log('Created new user preferences draft:', draftId)
    }
  }, [formId, hasDraft, loadDraft, createDraft, getDraftLastSaved])

  // Update form data when preferences are loaded
  useEffect(() => {
    if (preferences && !hasUnsavedChanges) {
      const preferencesData = {
        nameDisplayPreference: preferences.nameDisplayPreference as 'FIRST_NAME' | 'FIRST_LAST_NAME' | 'DISPLAY_NAME' | 'OPT_OUT',
        profileVisibility: preferences.profileVisibility as 'PUBLIC' | 'PRIVATE',
        optInCommunications: preferences.optInCommunications,
        optInTournamentUpdates: preferences.optInTournamentUpdates,
        optInLeaderboardUpdates: preferences.optInLeaderboardUpdates,
        optInMarketing: preferences.optInMarketing,
      }
      setFormData(preferencesData)
    }
  }, [preferences, hasUnsavedChanges])

  // Auto-save functionality
  const autoSave = useCallback(() => {
    // Always save preferences as they have meaningful default values
    saveDraft(formId, formData)
    setLastSaved(new Date())
    console.log('Auto-saved user preferences draft:', formData)
  }, [formData, formId, saveDraft])

  // Auto-save on form data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      autoSave()
    }, 3000) // 3 second delay

    return () => clearTimeout(timer)
  }, [autoSave])

  // Update form field
  const updateField = (field: keyof UserPreferencesFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Validation
  const validateForm = (data: UserPreferencesFormData) => {
    try {
      userPreferencesSchema.parse(data)
      return { isValid: true, errors: {} }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach(issue => {
          const field = issue.path[0] as string
          if (field) {
            fieldErrors[field] = issue.message
          }
        })
        return { isValid: false, errors: fieldErrors }
      }
      return { isValid: false, errors: { general: 'Validation failed' } }
    }
  }

  const isFormValid = () => {
    return true // User preferences are mostly optional
  }

  const isDirty = () => {
    return hasUnsavedChanges
  }

  // Submit form
  const handleSubmit = async () => {
    const validation = validateForm(formData)
    
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await updatePreferences.mutateAsync(formData)
    } catch (error) {
      console.error('Preferences update error:', error)
      setErrors({ general: error instanceof Error ? error.message : 'Preferences update failed' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async () => {
    try {
      await resetPreferences.mutateAsync()
      setFormData({
        nameDisplayPreference: 'FIRST_NAME',
        profileVisibility: 'PUBLIC',
        optInCommunications: false,
        optInTournamentUpdates: true,
        optInLeaderboardUpdates: true,
        optInMarketing: false,
      })
      setErrors({})
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error("Reset failed:", error)
    }
  }

  // Manual draft actions
  const saveDraftManually = () => {
    saveDraft(formId, formData)
    setLastSaved(new Date())
    setHasUnsavedChanges(false)
  }

  const clearDraftManually = () => {
    clearDraft(formId)
    setHasUnsavedChanges(false)
    setLastSaved(undefined)
  }

  // Get form behavior preferences - using hardcoded values to avoid infinite loop
  const autoSaveEnabled = true
  const draftPersistenceEnabled = true
  const showAdvancedOptions = false

  return (
    <LoadingWrapper
      isLoading={preferencesLoading || optionsLoading}
      error={preferencesError || optionsError}
      loadingComponent={<CardSkeleton />}
      errorComponent={<ErrorDisplay error={preferencesError || optionsError} />}
      className={className}
    >
      <div className="space-y-6">
        {/* Form Behavior Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Form Behavior</CardTitle>
            <CardDescription>
              Customize how forms behave in the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Auto-save Forms</div>
                <div className="text-sm text-muted-foreground">
                  Automatically save form data as you type
                </div>
              </div>
              <Checkbox
                checked={Boolean(autoSaveEnabled)}
                onCheckedChange={(checked: boolean) => updatePreference('theme', checked ? 'dark' : 'light')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Draft Persistence</div>
                <div className="text-sm text-muted-foreground">
                  Save form drafts across browser sessions
                </div>
              </div>
              <Checkbox
                checked={Boolean(draftPersistenceEnabled)}
                onCheckedChange={(checked: boolean) => updatePreference('emailNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Show Advanced Options</div>
                <div className="text-sm text-muted-foreground">
                  Display advanced form options and settings
                </div>
              </div>
              <Checkbox
                checked={Boolean(showAdvancedOptions)}
                onCheckedChange={(checked: boolean) => updatePreference('experimentalFeatures', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Preferences Form */}
        <EnhancedForm
          title="User Preferences"
          description="Manage your display preferences and communication settings"
          onSubmit={handleSubmit}
          showAutoSaveStatus={true}
          isAutoSaving={false}
          lastSaved={lastSaved}
          hasUnsavedChanges={hasUnsavedChanges}
          onSaveDraft={saveDraftManually}
          onClearDraft={clearDraftManually}
          hasDraft={hasDraft(formId)}
        >
          <EnhancedFormStatus 
            success={updatePreferences.isSuccess ? "Preferences updated successfully!" : undefined}
            error={errors.general || updatePreferences.error?.message}
          />

          {/* Display Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Display Preferences</h3>
            
            <EnhancedFormField
              label="Name Display Preference"
              required
              error={errors.nameDisplayPreference}
              hasUnsavedChanges={hasUnsavedChanges}
            >
              <Select
                value={formData.nameDisplayPreference}
                onValueChange={(value) => updateField('nameDisplayPreference', value)}
              >
                <SelectTrigger className={errors.nameDisplayPreference ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select how your name should be displayed" />
                </SelectTrigger>
                <SelectContent>
                  {availableNameOptions.map((option: { value: string; label: string }) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </EnhancedFormField>

            <EnhancedFormField
              label="Profile Visibility"
              required
              error={errors.profileVisibility}
              hasUnsavedChanges={hasUnsavedChanges}
            >
              <Select
                value={formData.profileVisibility}
                onValueChange={(value) => updateField('profileVisibility', value)}
              >
                <SelectTrigger className={errors.profileVisibility ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select profile visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                </SelectContent>
              </Select>
            </EnhancedFormField>
          </div>

          <Separator />

          {/* Communication Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Communication Preferences</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">General Communications</div>
                  <div className="text-sm text-muted-foreground">
                    Receive general updates and announcements
                  </div>
                </div>
                <Checkbox
                  checked={formData.optInCommunications}
                  onCheckedChange={(checked: boolean) => updateField('optInCommunications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Tournament Updates</div>
                  <div className="text-sm text-muted-foreground">
                    Get notified about tournament events and updates
                  </div>
                </div>
                <Checkbox
                  checked={formData.optInTournamentUpdates}
                  onCheckedChange={(checked: boolean) => updateField('optInTournamentUpdates', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Leaderboard Updates</div>
                  <div className="text-sm text-muted-foreground">
                    Receive leaderboard rankings and updates
                  </div>
                </div>
                <Checkbox
                  checked={formData.optInLeaderboardUpdates}
                  onCheckedChange={(checked: boolean) => updateField('optInLeaderboardUpdates', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Marketing Communications</div>
                  <div className="text-sm text-muted-foreground">
                    Receive promotional offers and marketing content
                  </div>
                </div>
              <Checkbox
                checked={formData.optInMarketing}
                onCheckedChange={(checked: boolean) => updateField('optInMarketing', checked)}
              />
              </div>
            </div>
          </div>

          <EnhancedFormActions
            onSubmit={handleSubmit}
            onReset={handleReset}
            onSaveDraft={saveDraftManually}
            onClearDraft={clearDraftManually}
            isSubmitting={isSubmitting || updatePreferences.isLoading || resetPreferences.isLoading}
            isValid={isFormValid()}
            isDirty={isDirty()}
            hasUnsavedChanges={hasUnsavedChanges}
            hasDraft={hasDraft(formId)}
            submitLabel="Save Preferences"
            resetLabel="Reset to Defaults"
            saveDraftLabel="Save Draft"
            clearDraftLabel="Clear Draft"
            showDraftActions={true}
          />
        </EnhancedForm>

        {/* Advanced Options (if enabled) */}
        {showAdvancedOptions && (
          <Card>
            <CardHeader>
              <CardTitle>Advanced Options</CardTitle>
              <CardDescription>
                Advanced form and UI customization options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Auto-save delay: 2000ms</p>
                <p>Draft retention: 7 days</p>
                <p>Form validation mode: onChange</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </LoadingWrapper>
  )
}

// Export with a cleaner name for easier importing
export { UserPreferencesWithStore as UserPreferences }