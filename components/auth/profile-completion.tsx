'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFormDraft } from '@/hooks/useFormDraft'
import { profileCompletionSchema } from '@/lib/validation/schemas'
import type { ProfileCompletionFormData } from '@/lib/validation/schemas'
import { 
  EnhancedForm, 
  EnhancedFormActions, 
  EnhancedFormStatus,
  EnhancedFormField 
} from '@/components/forms/enhanced-form-components'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTRPCMutationWithLoading } from '@/hooks/useTRPCWithLoading'
import { trpc } from '@/lib/trpc/client'
import { useSession } from './session-provider'
import { useUserPreferencesActions } from '@/stores/user-preferences-store-selectors'

interface ProfileCompletionProps {
  className?: string
}

export function ProfileCompletion({ className }: ProfileCompletionProps) {
  const { user, refetch } = useSession()
  const router = useRouter()

  // Load available games
  const { data: games } = trpc.games.list.useQuery({ includeInactive: false })

  // Update user profile mutation
  const updateProfile = useTRPCMutationWithLoading(
    'update-profile-completion',
    () => trpc.user.updateProfile.useMutation(),
    {
      onSuccess: () => {
        refetch()
        router.push("/")
      },
      onError: (error) => {
        console.error(`Failed to complete profile: ${error instanceof Error ? error.message : String(error)}`)
      },
    }
  )

  // Use user preferences store for form behavior
  const updatePreference = useUserPreferencesActions.updatePreference()

  // Enhanced form state with auto-save and draft persistence
  const formState = useFormDraft<ProfileCompletionFormData>({
    initialData: {
      firstName: '',
      lastName: '',
      location: '',
      favoriteGame: '',
    },
    validationSchema: profileCompletionSchema,
    onSubmit: async (data) => {
      await updateProfile.mutateAsync(data)
    },
    onSuccess: () => {
      // Success is handled by the mutation's onSuccess callback
    },
    onError: (error) => {
      console.error("Form submission error:", error)
    },
    showLoadingBar: true,
    // Enhanced features
    formId: `profile-completion-${user?.id || 'anonymous'}`,
    enableAutoSave: true,
    autoSaveDelay: 2000, // 2 seconds for profile completion
    enableDraftPersistence: true,
    enableUserPreferences: true,
    onAutoSave: (data) => {
      console.log('Auto-saved profile completion draft:', data)
    },
    onDraftRestore: (data) => {
      console.log('Restored profile completion draft:', data)
    },
  })

  // Update form data when user data is available
  useEffect(() => {
    if (user) {
      formState.setFields({
        firstName: (user as any).firstName || '',
        lastName: (user as any).lastName || '',
        location: (user as any).location || '',
        favoriteGame: (user as any).favoriteGame || '',
      })
    }
  }, [user, formState.setFields])

  if (!user) {
    return (
      <div className="text-center">
        <p>Please sign in to complete your profile.</p>
      </div>
    )
  }

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <EnhancedForm
        title="Complete Your Profile"
        description="Help us get to know you better by completing your profile information"
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
          success={updateProfile.isSuccess ? "Profile completed successfully!" : undefined}
          error={updateProfile.error?.message}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EnhancedFormField
            label="First Name"
            required
            error={formState.errors.firstName}
            hasUnsavedChanges={formState.hasUnsavedChanges}
          >
            <Input
              value={formState.data.firstName}
              onChange={(e) => formState.setField('firstName', e.target.value)}
              placeholder="Enter your first name"
              className={formState.errors.firstName ? 'border-destructive' : ''}
            />
          </EnhancedFormField>

          <EnhancedFormField
            label="Last Name"
            required
            error={formState.errors.lastName}
            hasUnsavedChanges={formState.hasUnsavedChanges}
          >
            <Input
              value={formState.data.lastName}
              onChange={(e) => formState.setField('lastName', e.target.value)}
              placeholder="Enter your last name"
              className={formState.errors.lastName ? 'border-destructive' : ''}
            />
          </EnhancedFormField>
        </div>

        <EnhancedFormField
          label="Location"
          error={formState.errors.location}
          hasUnsavedChanges={formState.hasUnsavedChanges}
        >
          <Input
            value={formState.data.location}
            onChange={(e) => formState.setField('location', e.target.value)}
            placeholder="City, State/Country"
            className={formState.errors.location ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Help other players find tournaments in your area
          </p>
        </EnhancedFormField>

        <EnhancedFormField
          label="Favorite Game"
          required
          error={formState.errors.favoriteGame}
          hasUnsavedChanges={formState.hasUnsavedChanges}
        >
          <Select
            value={formState.data.favoriteGame}
            onValueChange={(value) => formState.setField('favoriteGame', value)}
          >
            <SelectTrigger className={formState.errors.favoriteGame ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select your favorite game" />
            </SelectTrigger>
            <SelectContent>
              {games?.map((game) => (
                <SelectItem key={game.id} value={game.id}>
                  {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            This helps us recommend relevant tournaments and content
          </p>
        </EnhancedFormField>

        <EnhancedFormActions
          onSubmit={formState.submit}
          onSaveDraft={formState.saveDraftManually}
          onClearDraft={formState.clearDraftManually}
          isSubmitting={formState.isSubmitting || updateProfile.isLoading}
          isValid={formState.isValid}
          isDirty={formState.isDirty}
          hasUnsavedChanges={formState.hasUnsavedChanges}
          hasDraft={formState.hasDraft}
          submitLabel="Complete Profile"
          saveDraftLabel="Save Draft"
          clearDraftLabel="Clear Draft"
          showDraftActions={true}
        />
      </EnhancedForm>
    </div>
  )
}
