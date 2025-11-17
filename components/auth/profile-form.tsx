'use client'

import React from 'react'
import { useSession } from './session-provider'
import { useZustandForm } from '@/hooks/use-form-zustand'
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
import { trpc } from '@/lib/trpc/client'
import { useLoading, useError } from '@/stores/loading-store'
import { transformError } from '@/lib/utils/error-transformer'

interface ProfileFormProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

export function ProfileForm({ isOpen, onClose, onSave }: ProfileFormProps) {
  const { user, updateSession } = useSession()

  const formId = `profile-form-${user?.id || 'anonymous'}`

  // Loading and error state management
  const { setLoading } = useLoading('update-profile')
  const { setError, clearError } = useError('update-profile')
  
  // Profile update mutation with enhanced error handling
  const updateProfile = trpc.user.updateProfile.useMutation({
    onMutate: () => {
      setLoading(true)
      clearError()
    },
    onSuccess: () => {
      updateSession()
      onSave?.()
      onClose()
      setLoading(false)
    },
    onError: (error) => {
      console.error(`Failed to update profile: ${error instanceof Error ? error.message : String(error)}`)
      setError(error.message)
      setLoading(false)
    },
  })

  // Enhanced form state using Zustand-based form system with blur validation
  const formState = useZustandForm<ProfileUpdateFormData>({
    formId,
    formType: 'profile-update',
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
    validationTiming: 'blur',
    validationDebounce: 300,
    errorTransformer: (error: any) => {
      const transformed = transformError(error)
      return {
        field: transformed.field,
        message: transformed.message
      }
    },
    onSubmit: async (data) => {
      try {
        await updateProfile.mutateAsync(data as any)
      } catch (error) {
        // Error transformation is handled by errorTransformer
        const transformed = transformError(error)
        if (transformed.isFieldSpecific && transformed.field) {
          formState.setServerError(transformed.field as keyof ProfileUpdateFormData, transformed.message)
        }
        throw error
      }
    },
    onSuccess: () => {},
    onError: () => {},
    showLoadingBar: true,
    enableAutoSave: true,
    autoSaveDelay: 2000,
    userId: user?.id,
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
      closeOnOverlayClick={!formState.isSubmitting && !updateProfile.isPending}
    >
      <EnhancedForm
        title="Profile Settings"
        description="Update your profile information and preferences"
          onSubmit={formState.submit}
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
              error={formState.displayErrors.name}
            >
              <Input
                value={formState.data.name}
                onChange={(e) => formState.setField('name', e.target.value)}
                onBlur={() => formState.handleBlur('name')}
                placeholder="Enter your full name"
                className={formState.displayErrors.name ? 'border-destructive' : ''}
              />
            </EnhancedFormField>

            <EnhancedFormField
              label="Email"
              required
              error={formState.displayErrors.email}
            >
              <Input
                type="email"
                value={formState.data.email}
                onChange={(e) => formState.setField('email', e.target.value)}
                onBlur={() => formState.handleBlur('email')}
                placeholder="Enter your email"
                className={formState.displayErrors.email ? 'border-destructive' : ''}
              />
            </EnhancedFormField>

            <div className="grid grid-cols-2 gap-4">
              <EnhancedFormField
                label="First Name"
                required
                error={formState.displayErrors.firstName}
              >
                <Input
                  value={formState.data.firstName}
                  onChange={(e) => formState.setField('firstName', e.target.value)}
                  onBlur={() => formState.handleBlur('firstName')}
                  placeholder="First name"
                  className={formState.displayErrors.firstName ? 'border-destructive' : ''}
                />
              </EnhancedFormField>

              <EnhancedFormField
                label="Last Name"
                required
                error={formState.displayErrors.lastName}
              >
                <Input
                  value={formState.data.lastName}
                  onChange={(e) => formState.setField('lastName', e.target.value)}
                  onBlur={() => formState.handleBlur('lastName')}
                  placeholder="Last name"
                  className={formState.displayErrors.lastName ? 'border-destructive' : ''}
                />
              </EnhancedFormField>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            
            <EnhancedFormField
              label="Location"
              error={formState.displayErrors.location}
            >
              <Input
                value={formState.data.location}
                onChange={(e) => formState.setField('location', e.target.value)}
                onBlur={() => formState.handleBlur('location')}
                placeholder="City, State/Country"
                className={formState.displayErrors.location ? 'border-destructive' : ''}
              />
            </EnhancedFormField>

            <EnhancedFormField
              label="Phone"
              error={formState.displayErrors.phone}
            >
              <Input
                type="tel"
                value={formState.data.phone}
                onChange={(e) => formState.setField('phone', e.target.value)}
                onBlur={() => formState.handleBlur('phone')}
                placeholder="Phone number"
                className={formState.displayErrors.phone ? 'border-destructive' : ''}
              />
            </EnhancedFormField>
          </div>

          {/* Bio */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">About You</h3>
            
            <EnhancedFormField
              label="Bio"
              error={formState.displayErrors.bio}
            >
              <Textarea
                value={formState.data.bio}
                onChange={(e) => formState.setField('bio', e.target.value)}
                onBlur={() => formState.handleBlur('bio')}
                placeholder="Tell us about yourself..."
                rows={4}
                className={formState.displayErrors.bio ? 'border-destructive' : ''}
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