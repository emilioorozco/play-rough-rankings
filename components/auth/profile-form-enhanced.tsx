'use client'

import React, { useEffect } from 'react'
import { useSession } from './session-provider'
import { useFormDraft } from '@/hooks/useFormDraft'
import { profileUpdateSchema, type ProfileUpdateFormData } from '@/lib/validation/schemas'
import { 
  EnhancedForm, 
  EnhancedFormActions, 
  EnhancedFormStatus,
  EnhancedFormField 
} from '@/components/forms/enhanced-form-components'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useTRPCMutationWithLoading } from '@/hooks/useTRPCWithLoading'
import { trpc } from '@/lib/trpc/client'
import { useUIStoreSelectors } from '@/stores/selectors'

interface ProfileFormEnhancedProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

export function ProfileFormEnhanced({ isOpen, onClose, onSave }: ProfileFormEnhancedProps) {
  const { user, updateSession } = useSession()

  // Use UI store for modal management
  const modalState = useUIStoreSelectors.getModalState('userPreferences')

  // Profile update mutation with enhanced error handling
  const updateProfile = useTRPCMutationWithLoading(
    'update-profile',
    () => trpc.user.updateProfile.useMutation(),
    {
      onSuccess: () => {
        updateSession()
        onSave?.()
        onClose()
      },
      onError: (error) => {
        console.error(`Failed to update profile: ${error instanceof Error ? error.message : String(error)}`)
      },
    }
  )

  // Enhanced form state with auto-save and draft persistence
  const formState = useFormDraft<ProfileUpdateFormData>({
    initialData: {
      name: '',
      email: '',
      firstName: '',
      lastName: '',
      location: '',
      phone: '',
      bio: '',
    },
    validationSchema: profileUpdateSchema,
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
    formId: `profile-form-${user?.id || 'anonymous'}`,
    enableAutoSave: true,
    autoSaveDelay: 2000, // 2 seconds for profile forms
    enableDraftPersistence: true,
    enableUserPreferences: true,
    onAutoSave: (data) => {
      console.log('Auto-saved profile form draft:', data)
    },
    onDraftRestore: (data) => {
      console.log('Restored profile form draft:', data)
    },
  })

  // Update form data when user data is available
  useEffect(() => {
    if (user) {
      formState.setFields({
        name: user.name || '',
        email: user.email || '',
        firstName: (user as any).firstName || '',
        lastName: (user as any).lastName || '',
        location: (user as any).location || '',
        phone: (user as any).phone || '',
        bio: (user as any).bio || '',
      })
    }
  }, [user, formState.setFields])

  if (!user) {
    return (
      <div className="text-center">
        <p>Please sign in to manage your profile.</p>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      closeOnOverlayClick={!formState.isSubmitting && !updateProfile.isLoading}
    >
      <EnhancedForm
        title="Profile Settings"
        description="Update your profile information and preferences"
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
          success={updateProfile.isSuccess ? "Profile updated successfully!" : undefined}
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
          label="Display Name"
          required
          error={formState.errors.name}
          hasUnsavedChanges={formState.hasUnsavedChanges}
        >
          <Input
            value={formState.data.name}
            onChange={(e) => formState.setField('name', e.target.value)}
            placeholder="Enter your display name"
            className={formState.errors.name ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground mt-1">
            This is how your name will appear to other users
          </p>
        </EnhancedFormField>

        <EnhancedFormField
          label="Email"
          required
          error={formState.errors.email}
          hasUnsavedChanges={formState.hasUnsavedChanges}
        >
          <Input
            type="email"
            value={formState.data.email}
            onChange={(e) => formState.setField('email', e.target.value)}
            placeholder="Enter your email"
            className={formState.errors.email ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground mt-1">
            We'll use this to send you important updates
          </p>
        </EnhancedFormField>

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
          label="Phone Number"
          error={formState.errors.phone}
          hasUnsavedChanges={formState.hasUnsavedChanges}
        >
          <Input
            type="tel"
            value={formState.data.phone}
            onChange={(e) => formState.setField('phone', e.target.value)}
            placeholder="Enter your phone number"
            className={formState.errors.phone ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Optional - for tournament organizers to contact you
          </p>
        </EnhancedFormField>

        <EnhancedFormField
          label="Bio"
          error={formState.errors.bio}
          hasUnsavedChanges={formState.hasUnsavedChanges}
        >
          <Textarea
            value={formState.data.bio}
            onChange={(e) => formState.setField('bio', e.target.value)}
            placeholder="Tell us about yourself..."
            rows={4}
            className={formState.errors.bio ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground mt-1">
            A brief description about yourself and your gaming interests
          </p>
        </EnhancedFormField>

        <EnhancedFormActions
          onSubmit={formState.submit}
          onReset={formState.reset}
          onCancel={onClose}
          onSaveDraft={formState.saveDraftManually}
          onClearDraft={formState.clearDraftManually}
          isSubmitting={formState.isSubmitting || updateProfile.isLoading}
          isValid={formState.isValid}
          isDirty={formState.isDirty}
          hasUnsavedChanges={formState.hasUnsavedChanges}
          hasDraft={formState.hasDraft}
          submitLabel="Save Changes"
          resetLabel="Reset Changes"
          cancelLabel="Cancel"
          saveDraftLabel="Save Draft"
          clearDraftLabel="Clear Draft"
          showDraftActions={true}
        />
      </EnhancedForm>
    </Modal>
  )
}
