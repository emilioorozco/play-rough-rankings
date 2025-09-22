"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormSteps } from "@/hooks/useFormState";
import { tournamentRegistrationSchema, type TournamentRegistrationFormData } from "@/lib/validation/schemas";
import { ModalMultiStepForm, FormInput, FormTextarea, FormSelect, FormCombobox, FormCheckbox, FormActions, FormStatus } from "../ui/form-components";
import { Modal } from "../ui/modal";
import { useTRPCMutationWithLoading } from "@/hooks/useTRPCWithLoading";
import { trpc } from "@/lib/trpc/client";
import { z } from "zod";
import { useModal } from "@/stores/ui-store";
import { useFormDraft } from "@/hooks/useFormDraft";

interface TournamentRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  currentUser?: any;
  onSuccess?: () => void;
  className?: string;
}

export function TournamentRegistration({ 
  isOpen,
  onClose,
  tournamentId, 
  currentUser, 
  onSuccess, 
  className 
}: TournamentRegistrationProps) {
  const router = useRouter();
  const hasResetOnOpen = useRef(false);
  const hasResetOnClose = useRef(false);

  // Use UI store for modal management
  const modal = useModal('tournamentRegistration');

  // Registration mutation - always call this hook first
  const registerMutation = useTRPCMutationWithLoading(
    'tournament-registration',
    () => trpc.tournaments.register.useMutation(),
    {
      onSuccess: () => {
        // Success is handled by the form's onSubmit callback
      },
      // Remove onError to let errors propagate to the component
    }
  );

  // Always define the same steps array to ensure consistent hook order
  // We'll handle the conditional logic inside the form rendering
  const allSteps = ['personal-info', 'deck-info', 'confirmation'];
  
  // Check if we need to collect name information - after all hooks are called
  // NOTE: The 'name' field in currentUser is actually a displayName for backwards compatibility
  // We should check for firstName and lastName fields specifically
  const needsNameInfo = !currentUser?.firstName || !currentUser?.lastName;
  

  // Multi-step form state - always use the same steps array
  const formState = useFormSteps<TournamentRegistrationFormData>({
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
      });
      // Delay is handled by the form system's default loading delay
      // Modal will auto-close after the delay, then onSuccess will be called
    },
    onSuccess: () => {
      // Call the parent's onSuccess callback to update registration status
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Registration error:", error);
    },
    showLoadingBar: true,
  });


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
  ];

  // Reset form when modal opens and handle step navigation
  useEffect(() => {
    if (isOpen && !hasResetOnOpen.current) {
      hasResetOnOpen.current = true;
      hasResetOnClose.current = false;
      
      // Reset form data to initial values
      formState.setFields({
        firstName: currentUser?.firstName || '',
        lastName: currentUser?.lastName || '',
        deckArchetype: '',
        deckList: '',
        shareDeckList: true,
        agreesToConduct: false,
      });
      
      // Determine initial step based on whether name info is needed
      const initialStep = needsNameInfo ? 0 : 1; // Skip personal-info if not needed
      formState.goToStep(initialStep);
      
    }
  }, [isOpen, currentUser, formState.setFields, formState.goToStep, needsNameInfo]);

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen && !hasResetOnClose.current) {
      hasResetOnClose.current = true;
      hasResetOnOpen.current = false;
      
      formState.reset();
      registerMutation.reset();
    } else if (isOpen) {
      hasResetOnClose.current = false;
    }
  }, [isOpen, formState.reset, registerMutation.reset]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    formState.submit();
  };

  const renderPersonalInfoStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Personal Information</h3>
        <p className="text-sm text-muted-foreground">
          Please provide your name for tournament registration.
        </p>
      </div>

      <FormInput
        label="First Name"
        value={formState.data.firstName}
        onChange={(e) => formState.setField('firstName', e.target.value)}
        error={formState.errors.firstName}
        required
        placeholder="Enter your first name"
        description="Your first name as it should appear on tournament records"
      />

      <FormInput
        label="Last Name"
        value={formState.data.lastName}
        onChange={(e) => formState.setField('lastName', e.target.value)}
        error={formState.errors.lastName}
        required
        placeholder="Enter your last name"
        description="Your last name as it should appear on tournament records"
      />
    </div>
  );

  const renderDeckInfoStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Deck Information</h3>
        <p className="text-sm text-muted-foreground">
          Provide information about the deck you'll be playing.
        </p>
      </div>

      <FormSelect
        label="Deck Archetype"
        value={formState.data.deckArchetype}
        onValueChange={(value) => formState.setField('deckArchetype', value)}
        error={formState.errors.deckArchetype}
        required
        options={deckArchetypes.map(archetype => ({ value: archetype, label: archetype }))}
        placeholder="Select your deck archetype"
        description="Choose the archetype that best describes your deck"
      />

      <FormTextarea
        label="Deck List"
        value={formState.data.deckList}
        onChange={(e) => formState.setField('deckList', e.target.value)}
        error={formState.errors.deckList}
        required
        placeholder="Enter your deck list..."
        description="Provide your complete deck list. This helps with tournament organization and deck verification."
        rows={8}
      />

      <FormCheckbox
        label="Share Deck List"
        checked={formState.data.shareDeckList}
        onCheckedChange={(checked) => formState.setField('shareDeckList', checked)}
        description="Allow other players to view your deck list after the tournament"
      />
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Confirmation</h3>
        <p className="text-sm text-muted-foreground">
          Please review your registration details and confirm your participation.
        </p>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <h4 className="font-medium">Registration Summary</h4>
        <div className="text-sm space-y-1">
          <p><strong>Name:</strong> {formState.data.firstName} {formState.data.lastName}</p>
          <p><strong>Deck Archetype:</strong> {formState.data.deckArchetype}</p>
          <p><strong>Share Deck List:</strong> {formState.data.shareDeckList ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <FormCheckbox
        label="I agree to the Code of Conduct"
        checked={formState.data.agreesToConduct}
        onCheckedChange={(checked) => formState.setField('agreesToConduct', checked)}
        error={formState.errors.agreesToConduct}
        required
        description="By checking this box, you agree to follow the tournament's code of conduct and rules"
      />
    </div>
  );

  const renderStep = () => {
    switch (formState.currentStepName) {
      case 'personal-info':
        return renderPersonalInfoStep();
      case 'deck-info':
        return renderDeckInfoStep();
      case 'confirmation':
        return renderConfirmationStep();
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tournament Registration"
      size="lg"
      closeOnOverlayClick={!formState.isSubmitting && !registerMutation.isLoading}
      autoCloseDelay={registerMutation.isSuccess ? 3 : 0}
      success={registerMutation.isSuccess ? "Registration successful!" : undefined}
      isMultiStep={true}
      currentStep={registerMutation.isSuccess ? (needsNameInfo ? 3 : 2) : (needsNameInfo ? formState.currentStep : Math.max(0, formState.currentStep - 1))}
      totalSteps={needsNameInfo ? 3 : 2}
      onSubmit={handleSubmit}
      onCancel={handleClose}
      isSubmitting={formState.isSubmitting || registerMutation.isLoading}
      isValid={formState.isValid}
      isDirty={formState.isDirty}
      submitLabel={
        formState.currentStepName === 'confirmation'
          ? "Complete Registration" 
          : formState.currentStepName === 'success' 
            ? "View Tournament"
            : "Continue"
      }
      cancelLabel="Cancel"
      showCancel={formState.currentStepName !== 'success'}
    >
      <ModalMultiStepForm
        currentStep={needsNameInfo ? formState.currentStep : Math.max(0, formState.currentStep - 1)}
        totalSteps={needsNameInfo ? 3 : 2}
        className={className}
      >
        {/* Step Navigation - Above everything */}
        {!formState.isFirstStep && (
          <div className="flex justify-start mb-4">
            <button
              type="button"
              onClick={formState.goToPreviousStep}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              disabled={formState.isSubmitting}
            >
              ← Back to previous step
            </button>
          </div>
        )}

      <form onSubmit={(e) => e.preventDefault()}>
        <FormStatus 
          error={registerMutation.error?.message}
        />

        {renderStep()}

      </form>
      </ModalMultiStepForm>
    </Modal>
  );
}
