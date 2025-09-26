'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession } from './session-provider'
import { useFormDraftStore } from '@/stores/form-draft-store'
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
import { z } from 'zod'

interface ProfileFormProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

export function ProfileForm({ isOpen, onClose, onSave }: ProfileFormProps) {
  const { user, updateSession } = useSession()

  const modalState = useUIStoreSelectors.getModalState('userPreferences')

  // Local state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | undefined>()

  const formId = `profile-form-${user?.id || 'anonymous'}`
  
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
  const [formData, setFormData] = useState<ProfileUpdateFormData>({
    name: '',
    email: '',
    firstName: '',
    lastName: '',
    location: '',
    phone: '',
    bio: '',
  })

  // Profile update mutation with enhanced error handling
  const updateProfile = useTRPCMutationWithLoading(
    'update-profile',
    () => trpc.user.updateProfile.useMutation(),
    {
      onSuccess: () => {
        updateSession()
        // Clear draft on successful update
        clearDraft(formId)
        setHasUnsavedChanges(false)
        onSave?.()
        onClose()
      },
      onError: (error) => {
        console.error(`Failed to update profile: ${error instanceof Error ? error.message : String(error)}`)
        setErrors({ general: error instanceof Error ? error.message : 'Profile update failed' })
      },
    }
  )

  useEffect(() => {
    if (hasDraft(formId)) {
      const draftData = loadDraft(formId)
      if (draftData) {
        setFormData(draftData)
        setHasUnsavedChanges(true)
        setLastSaved(getDraftLastSaved(formId) ?? undefined)
      }
    } else {
      // Create initial draft
      const draftId = createDraft('profile-update', formData)
    }
  }, [formId, hasDraft, loadDraft, createDraft, getDraftLastSaved])

  // Update form data when user data is available
  useEffect(() => {
    if (user && !hasUnsavedChanges) {
      const userData = {
        name: user.name || '',
        email: user.email || '',
        firstName: (user as any).firstName || '',
        lastName: (user as any).lastName || '',
        location: (user as any).location || '',
        phone: (user as any).phone || '',
        bio: (user as any).bio || '',
      }
      setFormData(userData)
    }
  }, [user, hasUnsavedChanges])

  const autoSave = useCallback(() => {
    if (Object.values(formData).some(value => value !== '')) {
      saveDraft(formId, formData)
      setLastSaved(new Date())
    }
  }, [formData, formId, saveDraft])

  // Auto-save on form data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      autoSave()
    }, 2000) // 2 second delay

    return () => clearTimeout(timer)
  }, [autoSave])

  // Update form field
  const updateField = (field: keyof ProfileUpdateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Validation
  const validateForm = (data: ProfileUpdateFormData) => {
    try {
      profileUpdateSchema.parse(data)
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
    return formData.firstName && formData.lastName && formData.name && formData.email
  }

  const isDirty = () => {
    return Object.values(formData).some(value => value !== '')
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
      await updateProfile.mutateAsync(formData)
    } catch (error) {
      console.error('Profile update error:', error)
      setErrors({ general: error instanceof Error ? error.message : 'Profile update failed' })
    } finally {
      setIsSubmitting(false)
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
      closeOnOverlayClick={!isSubmitting && !updateProfile.isLoading}
    >
      <EnhancedForm
        title="Profile Settings"
        description="Update your profile information and preferences"
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
          success={updateProfile.isSuccess ? "Profile updated successfully!" : undefined}
          error={errors.general || updateProfile.error?.message}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EnhancedFormField
            label="First Name"
            required
            error={errors.firstName}
            hasUnsavedChanges={hasUnsavedChanges}
          >
            <Input
              value={formData.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              placeholder="Enter your first name"
              className={errors.firstName ? 'border-destructive' : ''}
            />
          </EnhancedFormField>

          <EnhancedFormField
            label="Last Name"
            required
            error={errors.lastName}
            hasUnsavedChanges={hasUnsavedChanges}
          >
            <Input
              value={formData.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              placeholder="Enter your last name"
              className={errors.lastName ? 'border-destructive' : ''}
            />
          </EnhancedFormField>
        </div>

        <EnhancedFormField
          label="Display Name"
          required
          error={errors.name}
          hasUnsavedChanges={hasUnsavedChanges}
        >
          <Input
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Enter your display name"
            className={errors.name ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground mt-1">
            This is how your name will appear to other users
          </p>
        </EnhancedFormField>

        <EnhancedFormField
          label="Email"
          required
          error={errors.email}
          hasUnsavedChanges={hasUnsavedChanges}
        >
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="Enter your email"
            className={errors.email ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground mt-1">
            We&apos;ll use this to send you important updates
          </p>
        </EnhancedFormField>

        <EnhancedFormField
          label="Location"
          error={errors.location}
          hasUnsavedChanges={hasUnsavedChanges}
        >
          <Input
            value={formData.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="City, State/Country"
            className={errors.location ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Help other players find tournaments in your area
          </p>
        </EnhancedFormField>

        <EnhancedFormField
          label="Phone Number"
          error={errors.phone}
          hasUnsavedChanges={hasUnsavedChanges}
        >
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="Enter your phone number"
            className={errors.phone ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Optional - for tournament organizers to contact you
          </p>
        </EnhancedFormField>

        <EnhancedFormField
          label="Bio"
          error={errors.bio}
          hasUnsavedChanges={hasUnsavedChanges}
        >
          <Textarea
            value={formData.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            placeholder="Tell us about yourself..."
            rows={4}
            className={errors.bio ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground mt-1">
            A brief description about yourself and your gaming interests
          </p>
        </EnhancedFormField>

        <EnhancedFormActions
          onSubmit={handleSubmit}
          onReset={() => {
            setFormData({
              name: user?.name || '',
              email: user?.email || '',
              firstName: (user as any)?.firstName || '',
              lastName: (user as any)?.lastName || '',
              location: (user as any)?.location || '',
              phone: (user as any)?.phone || '',
              bio: (user as any)?.bio || '',
            })
            setErrors({})
            setHasUnsavedChanges(false)
          }}
          onCancel={onClose}
          onSaveDraft={saveDraftManually}
          onClearDraft={clearDraftManually}
          isSubmitting={isSubmitting || updateProfile.isLoading}
          isValid={!!isFormValid()}
          isDirty={isDirty()}
          hasUnsavedChanges={hasUnsavedChanges}
          hasDraft={hasDraft(formId)}
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
