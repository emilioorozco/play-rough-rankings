'use client'

import React, { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from './session-provider'
import { useTRPCMutationWithLoading } from '@/hooks/useTRPCWithLoading'
import { trpc } from '@/lib/trpc/client'
import { useFormDraftIntegration } from '@/stores/form-draft-integration'
import { profileCompletionSchema } from '@/lib/validation/schemas'
import { FormInput, FormSelect, FormActions, FormStatus, StandaloneForm } from '@/components/ui/form-components'

interface ProfileCompletionProps {
  className?: string
}

export function ProfileCompletion({ className }: ProfileCompletionProps) {
  const { user, refetch } = useSession()
  const router = useRouter()
  const initializedRef = useRef(false)

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

  const {
    formData,
    draftErrors,
    isDirty,
    isSubmitting,
    updateField,
    validate,
    saveDraft,
    createDraft,
  } = useFormDraftIntegration(
    `profile-completion-${user?.id || 'anonymous'}`,
    'profile-completion',
    profileCompletionSchema
  )

  useEffect(() => {
    if (user && !initializedRef.current) {
      const initialData = {
        firstName: (user as any).firstName || '',
        lastName: (user as any).lastName || '',
        location: (user as any).location || '',
        favoriteGame: (user as any).favoriteGame || '',
      }
      createDraft(initialData)
      initializedRef.current = true
    }
  }, [user, createDraft])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDirty && formData) {
        saveDraft(formData)
      }
    }, 2000) // 2 second delay

    return () => clearTimeout(timer)
  }, [formData, isDirty, saveDraft])

  // Form submission handler
  const handleSubmit = async () => {
    try {
      const validation = validate(formData)
      if (!validation.isValid) {
        return // Errors are automatically set in store
      }
      
      await updateProfile.mutateAsync(formData)
    } catch (error) {
      console.error('Profile completion failed:', error)
    }
  }

  if (!user) {
    return (
      <div className="text-center">
        <p>Please sign in to complete your profile.</p>
      </div>
    )
  }

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <div className="w-full bg-background border rounded-lg shadow-lg">
        <StandaloneForm
          title="Complete Your Profile"
          description="Help us get to know you better by completing your profile information"
        >
          <FormStatus 
            success={updateProfile.isSuccess ? "Profile completed successfully!" : undefined}
            error={updateProfile.error?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              required
              error={draftErrors.firstName}
              value={formData?.firstName || ''}
              onChange={(e) => updateField('firstName', e.target.value)}
              placeholder="Enter your first name"
            />

            <FormInput
              label="Last Name"
              required
              error={draftErrors.lastName}
              value={formData?.lastName || ''}
              onChange={(e) => updateField('lastName', e.target.value)}
              placeholder="Enter your last name"
            />
          </div>

          <FormInput
            label="Location"
            error={draftErrors.location}
            value={formData?.location || ''}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="City, State/Country"
            description="Help other players find tournaments in your area"
          />

          <FormSelect
            label="Favorite Game"
            required
            error={draftErrors.favoriteGame}
            value={formData?.favoriteGame || ''}
            onValueChange={(value) => updateField('favoriteGame', value)}
            placeholder="Select your favorite game"
            options={games?.map(game => ({ value: game.id, label: game.name })) || []}
            description="This helps us recommend relevant tournaments and content"
          />

          <div className="pt-6 border-t">
            <FormActions
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting || updateProfile.isLoading}
              isValid={true}
              isDirty={isDirty}
              submitLabel="Complete Profile"
              showReset={false}
              showCancel={false}
            />
          </div>
        </StandaloneForm>
      </div>
    </div>
  )
}
