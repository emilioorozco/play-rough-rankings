'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from './session-provider'
import { useTRPCMutationWithLoading } from '@/hooks/useTRPCWithLoading'
import { trpc } from '@/lib/trpc/client'
import { useSimpleZustandForm } from '@/hooks/use-form-zustand'
import { profileCompletionSchema } from '@/lib/validation/schemas'
import { FormInput, FormSelect, FormActions, FormStatus, StandaloneForm } from '@/components/ui/form-components'

interface ProfileCompletionProps {
  className?: string
}

export function ProfileCompletion({ className }: ProfileCompletionProps) {
  const { user, refetch } = useSession()
  const router = useRouter()

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

  // Form state using Zustand-based form system
  const formState = useSimpleZustandForm({
    initialData: {
      firstName: (user as any)?.firstName || '',
      lastName: (user as any)?.lastName || '',
      location: (user as any)?.location || '',
      favoriteGame: (user as any)?.favoriteGame || '',
    },
    validationSchema: profileCompletionSchema,
    onSubmit: async (data) => {
      await updateProfile.mutateAsync(data)
    },
    onSuccess: () => {
      console.log('Profile completion successful')
    },
    onError: (error) => {
      console.error('Profile completion error:', error)
    },
    showLoadingBar: true,
  })


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
              error={formState.errors.firstName}
              value={formState.data.firstName}
              onChange={(e) => formState.setField('firstName', e.target.value)}
              placeholder="Enter your first name"
            />

            <FormInput
              label="Last Name"
              required
              error={formState.errors.lastName}
              value={formState.data.lastName}
              onChange={(e) => formState.setField('lastName', e.target.value)}
              placeholder="Enter your last name"
            />
          </div>

          <FormInput
            label="Location"
            error={formState.errors.location}
            value={formState.data.location}
            onChange={(e) => formState.setField('location', e.target.value)}
            placeholder="City, State/Country"
            description="Help other players find tournaments in your area"
          />

          <FormSelect
            label="Favorite Game"
            required
            error={formState.errors.favoriteGame}
            value={formState.data.favoriteGame}
            onValueChange={(value) => formState.setField('favoriteGame', value)}
            placeholder="Select your favorite game"
            options={games?.map(game => ({ value: game.id, label: game.name })) || []}
            description="This helps us recommend relevant tournaments and content"
          />

          <div className="pt-6 border-t">
            <FormActions
              onSubmit={formState.submit}
              isSubmitting={formState.isSubmitting || updateProfile.isLoading}
              isValid={formState.isValid}
              isDirty={formState.isDirty}
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
