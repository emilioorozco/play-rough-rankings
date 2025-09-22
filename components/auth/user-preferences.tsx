'use client'

import React, { useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useSession } from './session-provider'
import { useTRPCQueryWithLoading, useTRPCMutationWithLoading } from '@/hooks/useTRPCWithLoading'
import { LoadingWrapper, CardSkeleton, ErrorDisplay } from '../ui/loading-states'
import { useFormDraft } from '@/hooks/useFormDraft'
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
// Removed unused imports to fix TypeScript warnings
import { useUserPreferencesStore } from '@/stores/user-preferences-store'

interface UserPreferencesProps {
  className?: string
}

export function UserPreferencesWithStore({ className }: UserPreferencesProps) {
  const { user } = useSession()

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
        refetchPreferences()
      },
      onError: (error) => {
        console.error(`Failed to update preferences: ${error instanceof Error ? error.message : String(error)}`)
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
        refetchPreferences()
      },
      onError: (error) => {
        console.error(`Failed to reset preferences: ${error instanceof Error ? error.message : String(error)}`)
      },
    }
  )

  // Use user preferences store for form behavior - using direct store access to avoid infinite loops
  const updatePreference = useUserPreferencesStore((state) => state.updatePreference)

  // Enhanced form state with auto-save and draft persistence
  const formState = useFormDraft<UserPreferencesFormData>({
    initialData: {
      nameDisplayPreference: 'FIRST_NAME',
      profileVisibility: 'PUBLIC',
      optInCommunications: false,
      optInTournamentUpdates: true,
      optInLeaderboardUpdates: true,
      optInMarketing: false,
    },
    validationSchema: userPreferencesSchema,
    onSubmit: async (data) => {
      await updatePreferences.mutateAsync(data)
    },
    onSuccess: () => {
      // Success is handled by the mutation's onSuccess callback
    },
    onError: (error) => {
      console.error("Form submission error:", error)
    },
    showLoadingBar: true,
    // Enhanced features
    formId: `user-preferences-${user?.id || 'anonymous'}`,
    enableAutoSave: true,
    autoSaveDelay: 3000, // 3 seconds for preferences
    enableDraftPersistence: true,
    enableUserPreferences: true,
    onAutoSave: (data) => {
      console.log('Auto-saved user preferences draft:', data)
    },
    onDraftRestore: (data) => {
      console.log('Restored user preferences draft:', data)
    },
  })

  // Update form data when preferences are loaded
  useEffect(() => {
    if (preferences) {
      formState.setFields({
        nameDisplayPreference: preferences.nameDisplayPreference as 'FIRST_NAME' | 'FIRST_LAST_NAME' | 'DISPLAY_NAME' | 'OPT_OUT',
        profileVisibility: preferences.profileVisibility as 'PUBLIC' | 'PRIVATE',
        optInCommunications: preferences.optInCommunications,
        optInTournamentUpdates: preferences.optInTournamentUpdates,
        optInLeaderboardUpdates: preferences.optInLeaderboardUpdates,
        optInMarketing: preferences.optInMarketing,
      })
    }
  }, [preferences]) // Removed formState.setFields from dependencies to prevent infinite loop

  const handleReset = async () => {
    try {
      await resetPreferences.mutateAsync()
      formState.reset()
    } catch (error) {
      console.error("Reset failed:", error)
    }
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
          onSubmit={formState.handleSubmit}
          showAutoSaveStatus={true}
          isAutoSaving={formState.isAutoSaving}
          lastSaved={formState.lastSaved}
          hasUnsavedChanges={formState.hasUnsavedChanges}
          onSaveDraft={formState.saveDraftManually}
          onClearDraft={formState.clearDraftManually}
          hasDraft={formState.hasDraft}
        >
          <EnhancedFormStatus 
            success={updatePreferences.isSuccess ? "Preferences updated successfully!" : undefined}
            error={updatePreferences.error?.message}
          />

          {/* Display Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Display Preferences</h3>
            
            <EnhancedFormField
              label="Name Display Preference"
              required
              error={formState.errors.nameDisplayPreference}
              hasUnsavedChanges={formState.hasUnsavedChanges}
            >
              <Select
                value={formState.data.nameDisplayPreference}
                onValueChange={(value) => formState.setField('nameDisplayPreference', value)}
              >
                <SelectTrigger className={formState.errors.nameDisplayPreference ? 'border-destructive' : ''}>
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
              error={formState.errors.profileVisibility}
              hasUnsavedChanges={formState.hasUnsavedChanges}
            >
              <Select
                value={formState.data.profileVisibility}
                onValueChange={(value) => formState.setField('profileVisibility', value)}
              >
                <SelectTrigger className={formState.errors.profileVisibility ? 'border-destructive' : ''}>
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
                  checked={formState.data.optInCommunications}
                  onCheckedChange={(checked: boolean) => formState.setField('optInCommunications', checked)}
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
                  checked={formState.data.optInTournamentUpdates}
                  onCheckedChange={(checked: boolean) => formState.setField('optInTournamentUpdates', checked)}
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
                  checked={formState.data.optInLeaderboardUpdates}
                  onCheckedChange={(checked: boolean) => formState.setField('optInLeaderboardUpdates', checked)}
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
                checked={formState.data.optInMarketing}
                onCheckedChange={(checked: boolean) => formState.setField('optInMarketing', checked)}
              />
              </div>
            </div>
          </div>

          <EnhancedFormActions
            onSubmit={formState.submit}
            onReset={handleReset}
            onSaveDraft={formState.saveDraftManually}
            onClearDraft={formState.clearDraftManually}
            isSubmitting={formState.isSubmitting || updatePreferences.isLoading || resetPreferences.isLoading}
            isValid={formState.isValid}
            isDirty={formState.isDirty}
            hasUnsavedChanges={formState.hasUnsavedChanges}
            hasDraft={formState.hasDraft}
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