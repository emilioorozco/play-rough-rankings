'use client'

import React from 'react'
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

interface ProfileFormProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

export function ProfileForm({ isOpen, onClose, onSave }: ProfileFormProps) {
  const { user, updateSession } = useSession()

  const formId = `profile-form-${user?.id || 'anonymous'}`

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

  // Enhanced form state using Zustand-based draft system
  const formState = useFormDraft<ProfileUpdateFormData>({
    initialData: {
      name: user?.name || '',
      email: user?.email || '',
      firstName: (user as any)?.firstName || '',
      lastName: (user as any)?.lastName || '',
      location: (user as any)?.location || '',
      phone: (user as any)?.phone || '',
      bio: (user as any)?.bio || '',
    },
    validationSchema: profileUpdateSchema,
    onSubmit: async (data) => {
      await updateProfile.mutateAsync(data as any)
    },
    onSuccess: () => {
      // Success is handled by the mutation's onSuccess callback
    },
    onError: (error) => {
      console.error("Profile update error:", error)
    },
    showLoadingBar: true,
    // Enhanced Zustand features
    formId,
    enableAutoSave: true,
    autoSaveDelay: 2000,
    enableDraftPersistence: true,
    enableUserPreferences: true,
    onAutoSave: (data) => {
      console.log('Auto-saved profile draft:', data)
    },
    onDraftRestore: (data) => {
      console.log('Restored profile draft:', data)
    },
  })

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
        hasDraft={formState.hasDraft}
      >
        <EnhancedFormStatus 
          error={updateProfile.error?.message}
          success={updateProfile.isSuccess ? "Profile updated successfully!" : undefined}
        />

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <EnhancedFormField
              label="Full Name"
              required
              error={formState.errors.name}
            >
              <Input
                value={formState.data.name}
                onChange={(e) => formState.setField('name', e.target.value)}
                placeholder="Enter your full name"
                className={formState.errors.name ? 'border-destructive' : ''}
              />
            </EnhancedFormField>

            <EnhancedFormField
              label="Email"
              required
              error={formState.errors.email}
            >
              <Input
                type="email"
                value={formState.data.email}
                onChange={(e) => formState.setField('email', e.target.value)}
                placeholder="Enter your email"
                className={formState.errors.email ? 'border-destructive' : ''}
              />
            </EnhancedFormField>

            <div className="grid grid-cols-2 gap-4">
              <EnhancedFormField
                label="First Name"
                required
                error={formState.errors.firstName}
              >
                <Input
                  value={formState.data.firstName}
                  onChange={(e) => formState.setField('firstName', e.target.value)}
                  placeholder="First name"
                  className={formState.errors.firstName ? 'border-destructive' : ''}
                />
              </EnhancedFormField>

              <EnhancedFormField
                label="Last Name"
                required
                error={formState.errors.lastName}
              >
                <Input
                  value={formState.data.lastName}
                  onChange={(e) => formState.setField('lastName', e.target.value)}
                  placeholder="Last name"
                  className={formState.errors.lastName ? 'border-destructive' : ''}
                />
              </EnhancedFormField>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            
            <EnhancedFormField
              label="Location"
              error={formState.errors.location}
            >
              <Input
                value={formState.data.location}
                onChange={(e) => formState.setField('location', e.target.value)}
                placeholder="City, State/Country"
                className={formState.errors.location ? 'border-destructive' : ''}
              />
            </EnhancedFormField>

            <EnhancedFormField
              label="Phone"
              error={formState.errors.phone}
            >
              <Input
                type="tel"
                value={formState.data.phone}
                onChange={(e) => formState.setField('phone', e.target.value)}
                placeholder="Phone number"
                className={formState.errors.phone ? 'border-destructive' : ''}
              />
            </EnhancedFormField>
          </div>

          {/* Bio */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">About You</h3>
            
            <EnhancedFormField
              label="Bio"
              error={formState.errors.bio}
            >
              <Textarea
                value={formState.data.bio}
                onChange={(e) => formState.setField('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                className={formState.errors.bio ? 'border-destructive' : ''}
              />
            </EnhancedFormField>
          </div>
        </div>

        <EnhancedFormActions
          onSubmit={formState.submit}
          onReset={formState.reset}
          onCancel={onClose}
          isSubmitting={formState.isSubmitting}
          isValid={formState.isValid}
          isDirty={formState.isDirty}
          hasUnsavedChanges={formState.hasUnsavedChanges}
          hasDraft={formState.hasDraft}
          submitLabel="Update Profile"
          resetLabel="Reset"
          cancelLabel="Cancel"
          showDraftActions={false}
        />
      </EnhancedForm>
    </Modal>
  )
}