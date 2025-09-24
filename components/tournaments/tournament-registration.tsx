'use client'

import React, { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { useTRPCMutationWithLoading } from '@/hooks/useTRPCWithLoading'
import { useFormStepsEnhanced } from '@/hooks/useFormDraft'
import { useFormDraftStore } from '@/stores/form-draft-store'
import { useModal } from '@/stores/ui-store'
import { useTournamentStore } from '@/stores/tournament-store'
import { tournamentRegistrationSchema, type TournamentRegistrationFormData } from '@/lib/validation/schemas'
import { ModalForm } from '@/components/ui/form-components'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'

interface TournamentRegistrationProps {
  tournamentId: string
  currentUser?: {
    id: string
    role: string
    displayName?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
  } | null
  className?: string
}

export function TournamentRegistration({ 
  tournamentId, 
  currentUser, 
  className 
}: TournamentRegistrationProps) {
  const router = useRouter()
  const hasResetOnOpen = useRef(false)
  const hasResetOnClose = useRef(false)

  // Use UI store for modal management
  const modal = useModal('tournamentRegistration')
  const { hasDraft, clearDraft } = useFormDraftStore()
  
  // Use tournament store for state management
  const { setRegistrationStatus, invalidateTournament } = useTournamentStore()

  // tRPC utils for invalidation
  const utils = trpc.useUtils()

  // Registration mutation
  const registerMutation = useTRPCMutationWithLoading(
    'tournament-registration',
    () => trpc.tournaments.register.useMutation(),
    {
      onSuccess: async () => {
        // Update tournament store state
        setRegistrationStatus(tournamentId, {
          isRegistered: true,
          canRegister: false,
          canWithdraw: true,
          isFull: false,
          participantCount: 0, // Will be updated by the parent component
          maxPlayers: undefined,
        })
        invalidateTournament(tournamentId)
        // Invalidate relevant queries to refresh server state
        await Promise.all([
          utils.tournaments.getRegistrationStatus.invalidate({ tournamentId }),
          utils.tournaments.getById.invalidate({ id: tournamentId }),
        ])
      },
      onError: (error) => {
        console.error("Registration failed:", error)
      },
    }
  )

  // Reset mutation state when modal closes
  useEffect(() => {
    if (!modal.isOpen && registerMutation.isSuccess) {
      registerMutation.reset()
    }
  }, [modal.isOpen, registerMutation])

  // Define steps array conditionally based on user data
  const needsNameInfo = !currentUser?.firstName || !currentUser?.lastName
  const allSteps = needsNameInfo 
    ? ['personal-info', 'deck-info', 'confirmation']
    : ['deck-info', 'confirmation']

  // Enhanced multi-step form state
  const formState = useFormStepsEnhanced<TournamentRegistrationFormData>({
    steps: allSteps,
    initialData: {
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      deckArchetype: '',
      deckList: '',
      shareDeckList: true,
      agreesToConduct: false,
    },
    validationSchemas: needsNameInfo ? {
      'personal-info': tournamentRegistrationSchema.pick({
        firstName: true,
        lastName: true,
      }),
      'deck-info': tournamentRegistrationSchema.pick({
        deckArchetype: true,
        deckList: true,
        shareDeckList: true,
      }),
      'confirmation': tournamentRegistrationSchema.pick({
        agreesToConduct: true,
      }),
    } : {
      'deck-info': tournamentRegistrationSchema.pick({
        deckArchetype: true,
        deckList: true,
        shareDeckList: true,
      }),
      'confirmation': tournamentRegistrationSchema.pick({
        agreesToConduct: true,
      }),
    },
    onSubmit: async (data) => {
      await registerMutation.mutateAsync({
        tournamentId,
        ...data,
      })
    },
    onSuccess: () => {
      // Success is handled by the mutation's onSuccess callback
    },
    onError: (error) => {
      console.error("Registration error:", error)
    },
    showLoadingBar: true,
    // Enhanced features
    formId: `tournament-registration-${tournamentId}`,
    enableAutoSave: true,
    autoSaveDelay: 2000,
    enableDraftPersistence: true,
    enableUserPreferences: true,
    onAutoSave: (data) => {
      console.log('Auto-saved tournament registration draft:', data)
    },
    onDraftRestore: (data) => {
      console.log('Restored tournament registration draft:', data)
    },
  })

  const deckArchetypes = [
    'Aggro',
    'Control',
    'Midrange',
    'Combo',
    'Tempo',
    'Ramp',
    'Burn',
    'Mill',
    'Tribal',
    'Other',
  ]

  // Reset form when modal opens
  useEffect(() => {
    if (modal.isOpen && !hasResetOnOpen.current) {
      hasResetOnOpen.current = true
      hasResetOnClose.current = false
      
      // Reset form data to initial values
      formState.setFields({
        firstName: currentUser?.firstName || '',
        lastName: currentUser?.lastName || '',
        deckArchetype: '',
        deckList: '',
        shareDeckList: true,
        agreesToConduct: false,
      })
      
      // Reset to first step
      formState.goToStep(0)
    }
  }, [modal.isOpen, currentUser, formState.setFields, formState.goToStep])

  // Reset form when modal is closed
  useEffect(() => {
    if (!modal.isOpen && hasResetOnOpen.current && !hasResetOnClose.current) {
      hasResetOnClose.current = true
      hasResetOnOpen.current = false
      
      // Reset form state
      formState.reset()
    }
  }, [modal.isOpen, formState.reset])


  const renderStep = () => {
    switch (formState.currentStepName) {
      case 'personal-info':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
              <p className="text-muted-foreground">
                Please provide your name for tournament registration.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                First Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={formState.data.firstName}
                onChange={(e) => formState.setField('firstName', e.target.value)}
                placeholder="Enter your first name"
                className={formState.errors.firstName ? 'border-destructive' : ''}
              />
              {formState.errors.firstName && (
                <p className="text-sm text-destructive">{formState.errors.firstName}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Last Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={formState.data.lastName}
                onChange={(e) => formState.setField('lastName', e.target.value)}
                placeholder="Enter your last name"
                className={formState.errors.lastName ? 'border-destructive' : ''}
              />
              {formState.errors.lastName && (
                <p className="text-sm text-destructive">{formState.errors.lastName}</p>
              )}
            </div>
          </div>
        )

      case 'deck-info':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Deck Information</h3>
              <p className="text-muted-foreground">
                Tell us about your deck for this tournament.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Deck Archetype <span className="text-destructive">*</span>
              </label>
              <Select
                value={formState.data.deckArchetype}
                onValueChange={(value) => formState.setField('deckArchetype', value)}
              >
                <SelectTrigger className={formState.errors.deckArchetype ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select your deck archetype" />
                </SelectTrigger>
                <SelectContent>
                  {deckArchetypes.map((archetype) => (
                    <SelectItem key={archetype} value={archetype}>
                      {archetype}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formState.errors.deckArchetype && (
                <p className="text-sm text-destructive">{formState.errors.deckArchetype}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Deck List <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={formState.data.deckList}
                onChange={(e) => formState.setField('deckList', e.target.value)}
                placeholder="Paste your deck list here..."
                rows={8}
                className={formState.errors.deckList ? 'border-destructive' : ''}
              />
              {formState.errors.deckList && (
                <p className="text-sm text-destructive">{formState.errors.deckList}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="shareDeckList"
                checked={formState.data.shareDeckList}
                onCheckedChange={(checked) => formState.setField('shareDeckList', checked)}
              />
              <label
                htmlFor="shareDeckList"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Share my deck list publicly
              </label>
            </div>
          </div>
        )

      case 'confirmation':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Confirmation</h3>
              <p className="text-muted-foreground">
                Please review your information and confirm your registration.
              </p>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div>
                <span className="font-medium">Name:</span> {formState.data.firstName} {formState.data.lastName}
              </div>
              <div>
                <span className="font-medium">Deck Archetype:</span> {formState.data.deckArchetype}
              </div>
              <div>
                <span className="font-medium">Share Deck List:</span> {formState.data.shareDeckList ? 'Yes' : 'No'}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreesToConduct"
                checked={formState.data.agreesToConduct}
                onCheckedChange={(checked) => formState.setField('agreesToConduct', checked)}
                className={formState.errors.agreesToConduct ? 'border-destructive' : ''}
              />
              <label
                htmlFor="agreesToConduct"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to follow the tournament code of conduct
              </label>
            </div>
            {formState.errors.agreesToConduct && (
              <p className="text-sm text-destructive">{formState.errors.agreesToConduct}</p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Ensure form state is properly initialized before rendering
  if (!formState || !formState.steps) {
    return null
  }

  return (
    <Modal
      isOpen={modal.isOpen}
      onClose={modal.close}
      title="Tournament Registration"
      description="Register for the tournament by completing the steps below"
      size="lg"
      className={className}
      isMultiStep={true}
      currentStep={formState.currentStep}
      totalSteps={formState.steps?.length || 0}
      onSubmit={registerMutation.isSuccess ? modal.close : formState.submit}
      onCancel={registerMutation.isSuccess ? modal.close : (formState.isFirstStep ? modal.close : formState.goToPreviousStep)}
      isSubmitting={formState.isSubmitting}
      isValid={formState.isValid}
      isDirty={formState.isDirty}
      submitLabel={
        registerMutation.isSuccess 
          ? "Done" 
          : formState.isLastStep 
            ? "Complete Registration" 
            : "Continue"
      }
      cancelLabel={
        registerMutation.isSuccess 
          ? "Close" 
          : formState.isFirstStep 
            ? "Cancel" 
            : "Back"
      }
      showCancel={true}
      showReset={false}
      success={registerMutation.isSuccess ? "Registration successful!" : undefined}
      error={registerMutation.error?.message}
      autoCloseDelay={registerMutation.isSuccess ? 3 : 0}
    >
      <ModalForm onSubmit={formState.handleSubmit}>
        {renderStep()}
      </ModalForm>
    </Modal>
  )
}
