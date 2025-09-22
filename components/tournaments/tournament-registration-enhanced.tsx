'use client'

import React, { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { useTRPCMutationWithLoading } from '@/hooks/useTRPCWithLoading'
import { useFormStepsEnhanced } from '@/hooks/useFormDraft'
import { useModal } from '@/stores/ui-store'
import { useFormDraftStore } from '@/stores/form-draft-store'
import { tournamentRegistrationSchema, type TournamentRegistrationFormData } from '@/lib/validation/schemas'
import { 
  EnhancedMultiStepForm, 
  EnhancedFormActions, 
  EnhancedFormStatus,
  EnhancedFormField 
} from '@/components/forms/enhanced-form-components'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'

interface TournamentRegistrationEnhancedProps {
  tournamentId: string
  currentUser?: {
    id: string
    role: string
    displayName?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
  } | null
  onSuccess?: () => void
  className?: string
}

export function TournamentRegistrationEnhanced({ 
  tournamentId, 
  currentUser, 
  onSuccess, 
  className 
}: TournamentRegistrationEnhancedProps) {
  const router = useRouter()
  const hasResetOnOpen = useRef(false)
  const hasResetOnClose = useRef(false)

  // Use UI store for modal management
  const modal = useModal('tournamentRegistration')
  const { hasDraft, clearDraft } = useFormDraftStore()

  // Registration mutation
  const registerMutation = useTRPCMutationWithLoading(
    'tournament-registration',
    () => trpc.tournaments.register.useMutation(),
    {
      onSuccess: () => {
        // Success is handled by the form's onSubmit callback
      },
      onError: (error) => {
        console.error("Registration failed:", error)
      },
    }
  )

  // Define steps array
  const allSteps = ['personal-info', 'deck-info', 'confirmation']
  
  const needsNameInfo = !currentUser?.firstName || !currentUser?.lastName

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
    validationSchemas: {
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

  // Handle success callback when modal closes after success
  useEffect(() => {
    if (!modal.isOpen && formState.currentStepName === 'confirmation' && registerMutation.isSuccess) {
      // Call onSuccess to update parent state when modal closes
      onSuccess?.()
    }
  }, [modal.isOpen, formState.currentStepName, registerMutation.isSuccess, onSuccess])

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
            
            <EnhancedFormField
              label="Deck Archetype"
              required
              error={formState.errors.deckArchetype}
              hasUnsavedChanges={formState.hasUnsavedChanges}
            >
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
            </EnhancedFormField>
            
            <EnhancedFormField
              label="Deck List"
              required
              error={formState.errors.deckList}
              hasUnsavedChanges={formState.hasUnsavedChanges}
            >
              <Textarea
                value={formState.data.deckList}
                onChange={(e) => formState.setField('deckList', e.target.value)}
                placeholder="Paste your deck list here..."
                rows={8}
                className={formState.errors.deckList ? 'border-destructive' : ''}
              />
            </EnhancedFormField>
            
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

  return (
    <Modal
      isOpen={modal.isOpen}
      onClose={modal.close}
      size="lg"
      className={className}
    >
      <EnhancedMultiStepForm
        title="Tournament Registration"
        description="Register for the tournament by completing the steps below"
        currentStep={formState.currentStep}
        totalSteps={formState.steps.length}
        onSubmit={formState.handleSubmit}
        showProgress={true}
        showAutoSaveStatus={true}
        isAutoSaving={formState.isAutoSaving}
        lastSaved={formState.lastSaved}
        hasUnsavedChanges={formState.hasUnsavedChanges}
        onSaveDraft={formState.saveDraftManually}
        onClearDraft={formState.clearDraftManually}
        hasDraft={formState.hasDraft}
      >
        <EnhancedFormStatus
          success={registerMutation.isSuccess ? "Registration successful!" : undefined}
          error={registerMutation.error?.message}
        />

        {renderStep()}

        <EnhancedFormActions
          onSubmit={formState.submit}
          onReset={formState.reset}
          onCancel={modal.close}
          onSaveDraft={formState.saveDraftManually}
          onClearDraft={formState.clearDraftManually}
          isSubmitting={formState.isSubmitting}
          isValid={formState.isValid}
          isDirty={formState.isDirty}
          hasUnsavedChanges={formState.hasUnsavedChanges}
          hasDraft={formState.hasDraft}
          submitLabel={formState.isLastStep ? "Complete Registration" : "Continue"}
          resetLabel="Reset Form"
          cancelLabel="Cancel"
          saveDraftLabel="Save Draft"
          clearDraftLabel="Clear Draft"
          showDraftActions={true}
        />

        {/* Step Navigation */}
        {!formState.isLastStep && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={formState.goToPreviousStep}
              disabled={formState.isFirstStep}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <Button
              type="button"
              onClick={formState.goToNextStep}
              disabled={!formState.isValid}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </EnhancedMultiStepForm>
    </Modal>
  )
}
