"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormSteps } from "@/hooks/useFormState";
import { tournamentCreateSchema, type TournamentCreateFormData } from "@/lib/validation/schemas";
import { ModalMultiStepForm, FormInput, FormTextarea, FormSelect, FormCheckbox, FormActions, FormStatus } from "../ui/form-components";
import { Modal } from "../ui/modal";
import { useTRPCMutationWithLoading } from "@/hooks/useTRPCWithLoading";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "@/components/auth/session-provider";

interface TournamentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  className?: string;
}

export function TournamentCreateModal({ 
  isOpen,
  onClose,
  onSuccess, 
  className 
}: TournamentCreateModalProps) {
  const router = useRouter();
  const { user } = useSession();
  const hasResetOnOpen = useRef(false);
  const hasResetOnClose = useRef(false);

  // Load available games and stores
  const { data: games } = trpc.games.list.useQuery({ includeInactive: false });
  const { data: stores } = trpc.stores.list.useQuery({});

  // Create tournament mutation
  const createTournament = useTRPCMutationWithLoading(
    'create-tournament',
    () => trpc.tournaments.create.useMutation(),
    {
      onSuccess: (data: any) => {
        onSuccess?.();
        router.push(`/tournaments/${data.id}`);
      },
      onError: (error) => {
        console.error("Tournament creation failed:", error);
      },
    }
  );

  // Multi-step form state
  const formState = useFormSteps<TournamentCreateFormData>({
    steps: ['basic-info', 'description', 'details', 'settings', 'confirmation'],
    initialData: {
      name: '',
      description: '',
      gameId: '',
      storeId: '',
      date: '',
      format: 'swiss',
      maxPlayers: '32',
      entryFee: '0',
      prizePool: '0',
      tournamentLevel: 'LOCAL' as const,
    },
    validationSchemas: {
      'basic-info': tournamentCreateSchema.pick({
        name: true,
        gameId: true,
        storeId: true,
      }),
      'description': tournamentCreateSchema.pick({
        description: true,
      }),
      'details': tournamentCreateSchema.pick({
        date: true,
        maxPlayers: true,
        entryFee: true,
        prizePool: true,
      }),
      'settings': tournamentCreateSchema.pick({
        format: true,
        tournamentLevel: true,
      }),
      'confirmation': tournamentCreateSchema.pick({
        name: true,
        description: true,
        gameId: true,
        storeId: true,
        date: true,
        maxPlayers: true,
        entryFee: true,
        prizePool: true,
        format: true,
        tournamentLevel: true,
      }),
    },
    onSubmit: async (data) => {
      // Transform form data to match backend schema
      const transformedData = {
        name: data.name,
        description: data.description,
        gameId: data.gameId,
        storeId: data.storeId,
        organizerId: user?.id || '', // Add organizer ID
        date: new Date(data.date).toISOString(), // Convert to ISO datetime
        format: data.format,
        maxPlayers: parseInt(data.maxPlayers), // Convert string to number
        entryFee: parseFloat(data.entryFee), // Convert string to number
        prizePool: data.prizePool, // Keep as string as backend expects
        tournamentLevel: data.tournamentLevel,
      };
      
      await createTournament.mutateAsync(transformedData);
    },
    onSuccess: () => {
      console.log("Tournament created successfully!");
    },
    onError: (error) => {
      console.error("Tournament creation error:", error);
    },
    showLoadingBar: true,
  });

  const formatOptions = [
    { value: 'swiss', label: 'Swiss' },
    { value: 'single-elimination', label: 'Single Elimination' },
    { value: 'double-elimination', label: 'Double Elimination' },
    { value: 'round-robin', label: 'Round Robin' },
  ];

  // Handle success callback when modal closes after success
  useEffect(() => {
    if (!isOpen && createTournament.isSuccess) {
      // Call onSuccess to update parent state when modal closes
      onSuccess?.();
    }
  }, [isOpen, createTournament.isSuccess, onSuccess]);

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen && !hasResetOnClose.current) {
      hasResetOnClose.current = true;
      hasResetOnOpen.current = false;
      formState.reset();
      // Reset mutation state to clear success message
      createTournament.reset();
    } else if (isOpen) {
      hasResetOnClose.current = false;
    }
  }, [isOpen]);

  // Reset form to first step when modal opens
  useEffect(() => {
    if (isOpen && !hasResetOnOpen.current) {
      hasResetOnOpen.current = true;
      formState.reset();
      formState.goToStep(0);
    }
  }, [isOpen]);

  // Simple close handler
  const handleClose = () => {
    onClose();
    onSuccess?.(); // Call the onSuccess callback to update parent state
  };

  const renderBasicInfoStep = () => (
    <div className="space-y-6">
      <FormInput
        label="Tournament Name"
        value={formState.data.name}
        onChange={(e) => formState.setField('name', e.target.value)}
        error={formState.errors.name}
        required
        placeholder="Enter tournament name"
        description="Choose a clear, descriptive name for your tournament"
      />

      <FormSelect
        label="Game"
        value={formState.data.gameId}
        onValueChange={(value) => formState.setField('gameId', value)}
        error={formState.errors.gameId}
        required
        options={games?.map(game => ({ value: game.id, label: game.name })) || []}
        placeholder="Select a game"
        description="Choose the game this tournament is for"
      />

      <FormSelect
        label="Store"
        value={formState.data.storeId}
        onValueChange={(value) => formState.setField('storeId', value)}
        error={formState.errors.storeId}
        required
        options={stores?.stores?.map(store => ({ value: store.id, label: store.name })) || []}
        placeholder="Select a store"
        description="Choose where the tournament will be held"
      />
    </div>
  );

  const renderDescriptionStep = () => (
    <div className="space-y-6">
      <FormTextarea
        label="Description"
        value={formState.data.description}
        onChange={(e) => formState.setField('description', e.target.value)}
        error={formState.errors.description}
        required
        placeholder="Enter tournament description..."
        description="Include details about format, rules, prizes, registration requirements, etc."
        rows={8}
      />
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Tournament Details</h3>
        <p className="text-sm text-muted-foreground">
          Set the timing and financial details for your tournament
        </p>
      </div>

      <FormInput
        label="Tournament Date & Time"
        type="datetime-local"
        value={formState.data.date}
        onChange={(e) => formState.setField('date', e.target.value)}
        error={formState.errors.date}
        required
        description="When does the tournament take place?"
      />

      <FormInput
        label="Maximum Players"
        type="text"
        value={formState.data.maxPlayers}
        onChange={(e) => formState.setField('maxPlayers', e.target.value)}
        error={formState.errors.maxPlayers}
        required
        placeholder="32"
        description="Maximum number of participants allowed"
      />

      <FormInput
        label="Entry Fee"
        type="text"
        value={formState.data.entryFee}
        onChange={(e) => formState.setField('entryFee', e.target.value)}
        error={formState.errors.entryFee}
        required
        placeholder="0"
        description="Entry fee per player (in dollars)"
      />

      <FormInput
        label="Prize Pool"
        type="text"
        value={formState.data.prizePool}
        onChange={(e) => formState.setField('prizePool', e.target.value)}
        error={formState.errors.prizePool}
        required
        placeholder="0"
        description="Total prize pool (in dollars)"
      />
    </div>
  );

  const renderSettingsStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Tournament Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure the tournament format and level
        </p>
      </div>

      <FormSelect
        label="Tournament Format"
        value={formState.data.format}
        onValueChange={(value) => formState.setField('format', value)}
        error={formState.errors.format}
        required
        options={formatOptions}
        description="Choose the tournament structure"
      />

      <FormSelect
        label="Tournament Level"
        value={formState.data.tournamentLevel}
        onValueChange={(value) => formState.setField('tournamentLevel', value)}
        error={formState.errors.tournamentLevel}
        required
        options={[
          { value: 'LOCAL', label: 'Local' },
          { value: 'REGIONAL', label: 'Regional' },
          { value: 'NATIONAL', label: 'National' },
          { value: 'INTERNATIONAL', label: 'International' },
        ]}
        description="Choose the tournament level"
      />
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Confirmation</h3>
        <p className="text-sm text-muted-foreground">
          Please review your tournament details before creating
        </p>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <h4 className="font-medium">Tournament Summary</h4>
        <div className="text-sm space-y-1">
          <p><strong>Name:</strong> {formState.data.name}</p>
          {formState.data.description && (
            <div>
              <p><strong>Description:</strong></p>
              <p className="text-muted-foreground ml-2 whitespace-pre-wrap">{formState.data.description}</p>
            </div>
          )}
          <p><strong>Game:</strong> {games?.find(g => g.id === formState.data.gameId)?.name}</p>
          <p><strong>Store:</strong> {stores?.stores?.find(s => s.id === formState.data.storeId)?.name}</p>
          <p><strong>Date:</strong> {new Date(formState.data.date).toLocaleString()}</p>
          <p><strong>Max Players:</strong> {formState.data.maxPlayers}</p>
          <p><strong>Entry Fee:</strong> ${formState.data.entryFee}</p>
          <p><strong>Prize Pool:</strong> ${formState.data.prizePool}</p>
          <p><strong>Format:</strong> {formatOptions.find(f => f.value === formState.data.format)?.label}</p>
          <p><strong>Level:</strong> {formState.data.tournamentLevel}</p>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (formState.currentStepName) {
      case 'basic-info':
        return renderBasicInfoStep();
      case 'description':
        return renderDescriptionStep();
      case 'details':
        return renderDetailsStep();
      case 'settings':
        return renderSettingsStep();
      case 'confirmation':
        return renderConfirmationStep();
      default:
        return null;
    }
  };

  // Check if user has permission
  if (!user || (user.role !== 'organizer' && user.role !== 'admin')) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Access Denied"
        size="md"
      >
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don&apos;t have permission to create tournaments.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Tournament"
      size="lg"
      closeOnOverlayClick={!formState.isSubmitting && !createTournament.isLoading}
      autoCloseDelay={createTournament.isSuccess ? 3 : 0}
      success={createTournament.isSuccess ? "Tournament created successfully!" : undefined}
      isMultiStep={true}
      currentStep={formState.currentStep}
      totalSteps={5}
      onSubmit={formState.submit}
      onCancel={handleClose}
      isSubmitting={formState.isSubmitting || createTournament.isLoading}
      isValid={formState.isValid}
      isDirty={formState.isDirty}
      submitLabel={
        formState.currentStepName === 'confirmation'
          ? "Create Tournament" 
          : "Continue"
      }
      cancelLabel="Cancel"
      showCancel={true}
    >
      <ModalMultiStepForm
        currentStep={formState.currentStep}
        totalSteps={5}
        className={className}
      >
        {/* Step Navigation */}
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
            error={createTournament.error?.message}
          />

        {renderStep()}
      </form>
      </ModalMultiStepForm>
    </Modal>
  );
}
