'use client'

import React from 'react'
import { trpc } from '@/lib/trpc/client'
import { useSession } from './session-provider'
import { useTRPCQueryWithLoading, useTRPCMutationWithLoading } from '@/hooks/useTRPCWithLoading'
import { CardSkeleton, ErrorDisplay } from '../ui/loading-states'
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
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface UserPreferencesProps {
  className?: string
}

export function UserPreferencesWithStore({ className }: UserPreferencesProps) {
  const { user } = useSession()

  const formId = `user-preferences-${user?.id || 'anonymous'}`

  // Fetch user preferences
  const preferencesQuery = useTRPCQueryWithLoading(
    'user-preferences',
    () => trpc.userPreferences.get.useQuery(),
    {
      enabled: !!user,
    }
  )

  // Update user preferences mutation
  const updatePreferences = useTRPCMutationWithLoading(
    'update-user-preferences',
    () => trpc.userPreferences.update.useMutation(),
    {
      onSuccess: () => {
        preferencesQuery.refetch()
      },
      onError: (error) => {
        console.error(`Failed to update preferences: ${error instanceof Error ? error.message : String(error)}`)
      },
    }
  )

  // Enhanced form state using Zustand-based draft system
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
      console.error("Preferences update error:", error)
    },
    showLoadingBar: true,
    // Enhanced Zustand features
    formId,
    enableAutoSave: true,
    autoSaveDelay: 2000,
    enableDraftPersistence: true,
    enableUserPreferences: true,
    onAutoSave: (data) => {
      console.log('Auto-saved preferences draft:', data)
    },
    onDraftRestore: (data) => {
      console.log('Restored preferences draft:', data)
    },
  })

  // Update form data when preferences are loaded
  React.useEffect(() => {
    if (preferencesQuery.data && !formState.hasUnsavedChanges) {
      formState.setFields({
        nameDisplayPreference: preferencesQuery.data.nameDisplayPreference || 'FIRST_NAME',
        profileVisibility: preferencesQuery.data.profileVisibility || 'PUBLIC',
        optInCommunications: preferencesQuery.data.optInCommunications || false,
        optInTournamentUpdates: preferencesQuery.data.optInTournamentUpdates || true,
        optInLeaderboardUpdates: preferencesQuery.data.optInLeaderboardUpdates || true,
        optInMarketing: preferencesQuery.data.optInMarketing || false,
      })
    }
  }, [preferencesQuery.data, formState])

  if (preferencesQuery.isLoading) {
    return (
      <div className={className}>
        <CardSkeleton />
      </div>
    )
  }

  if (preferencesQuery.error) {
    return (
      <div className={className}>
        <ErrorDisplay 
          error={preferencesQuery.error} 
          title="Failed to load preferences"
          onRetry={preferencesQuery.refetch}
        />
      </div>
    )
  }

  if (!user) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>User Preferences</CardTitle>
          <CardDescription>Please sign in to manage your preferences.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className={className}>
      <EnhancedForm
        title="User Preferences"
        description="Customize your experience and privacy settings"
        onSubmit={formState.handleSubmit}
        showAutoSaveStatus={true}
        isAutoSaving={formState.isAutoSaving}
        lastSaved={formState.lastSaved}
        hasUnsavedChanges={formState.hasUnsavedChanges}
        hasDraft={formState.hasDraft}
      >
        <EnhancedFormStatus 
          error={updatePreferences.error?.message}
          success={updatePreferences.isSuccess ? "Preferences updated successfully!" : undefined}
        />

        <div className="space-y-8">
          {/* Display Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Display Preferences</h3>
            
            <EnhancedFormField
              label="Name Display Preference"
              error={formState.errors.nameDisplayPreference}
            >
              <Select
                value={formState.data.nameDisplayPreference}
                onValueChange={(value) => formState.setField('nameDisplayPreference', value)}
              >
                <SelectTrigger className={formState.errors.nameDisplayPreference ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select how your name should be displayed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIRST_NAME">First Name Only</SelectItem>
                  <SelectItem value="FULL_NAME">Full Name</SelectItem>
                  <SelectItem value="USERNAME">Username</SelectItem>
                  <SelectItem value="HIDDEN">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </EnhancedFormField>

            <EnhancedFormField
              label="Profile Visibility"
              error={formState.errors.profileVisibility}
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
                  <SelectItem value="FRIENDS_ONLY">Friends Only</SelectItem>
                </SelectContent>
              </Select>
            </EnhancedFormField>
          </div>

          <Separator />

          {/* Communication Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Communication Preferences</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="optInCommunications"
                  checked={formState.data.optInCommunications}
                  onCheckedChange={(checked) => formState.setField('optInCommunications', checked)}
                />
                <label
                  htmlFor="optInCommunications"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Allow general communications
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="optInTournamentUpdates"
                  checked={formState.data.optInTournamentUpdates}
                  onCheckedChange={(checked) => formState.setField('optInTournamentUpdates', checked)}
                />
                <label
                  htmlFor="optInTournamentUpdates"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Tournament updates and notifications
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="optInLeaderboardUpdates"
                  checked={formState.data.optInLeaderboardUpdates}
                  onCheckedChange={(checked) => formState.setField('optInLeaderboardUpdates', checked)}
                />
                <label
                  htmlFor="optInLeaderboardUpdates"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Leaderboard updates and rankings
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="optInMarketing"
                  checked={formState.data.optInMarketing}
                  onCheckedChange={(checked) => formState.setField('optInMarketing', checked)}
                />
                <label
                  htmlFor="optInMarketing"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Marketing communications and promotions
                </label>
              </div>
            </div>
          </div>
        </div>

        <EnhancedFormActions
          onSubmit={formState.submit}
          onReset={formState.reset}
          isSubmitting={formState.isSubmitting}
          isValid={formState.isValid}
          isDirty={formState.isDirty}
          hasUnsavedChanges={formState.hasUnsavedChanges}
          hasDraft={formState.hasDraft}
          submitLabel="Save Preferences"
          resetLabel="Reset"
          showDraftActions={false}
        />
      </EnhancedForm>
    </div>
  )
}

// Export alias for backward compatibility
export const UserPreferences = UserPreferencesWithStore