"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useZustandFormSteps } from "@/hooks/use-form-zustand";
import { tournamentCreateSchema, type TournamentCreateFormData } from "@/lib/validation/schemas";
import { ModalMultiStepForm, FormInput, FormTextarea, FormSelect, FormActions, FormStatus } from "../ui/form-components";
import { Modal } from "../ui/modal";
import { trpc } from "@/lib/trpc/client";
import { useLoading, useError } from "@/stores/loading-store";
import { useSession } from "@/components/auth/session-provider";
import { useTournamentOperations } from "@/stores/tournament-store";

interface TournamentCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  className?: string;
}

export function TournamentCreateForm({ 
  isOpen,
  onClose,
  onSuccess, 
  className 
}: TournamentCreateFormProps) {
  const router = useRouter();
  const { user } = useSession();
  const { invalidateTournamentList } = useTournamentOperations();

  // Load available games and stores
  const { data: games } = trpc.games.list.useQuery({ includeInactive: false });
  const { data: stores } = trpc.stores.list.useQuery({});

  // Loading and error state management
  const { setLoading } = useLoading('create-tournament')
  const { setError, clearError } = useError('create-tournament')
  
  // Create tournament mutation
  const createTournament = trpc.tournaments.create.useMutation({
    onMutate: () => {
      setLoading(true)
      clearError()
    },
    onSuccess: (data: any) => {
      // Invalidate tournament list to refresh data
      invalidateTournamentList();
      onSuccess?.();
      onClose();
      router.push(`/tournaments/${data.id}`);
      setLoading(false)
    },
    onError: (error: any) => {
      console.error("Tournament creation failed:", error);
      setError(error.message)
      setLoading(false)
    },
  } as any);

  // Multi-step form state using Zustand
  // Use useMemo to keep formId stable across renders
  const formId = React.useMemo(
    () => `tournament-create-${user?.id || 'anonymous'}-${Date.now()}`,
    [user?.id]
  );
  
  const formState = useZustandFormSteps<TournamentCreateFormData>({
    steps: ['basic-info', 'description', 'details', 'settings', 'confirmation'],
    formId,
    formType: 'tournament-create-form',
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
      tournamentLevel: 'LOCAL',
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
      const transformed = {
        name: data.name,
        description: data.description,
        gameId: data.gameId,
        storeId: data.storeId,
        organizerId: user?.id || '',
        date: new Date(data.date).toISOString(),
        format: data.format,
        maxPlayers: parseInt(data.maxPlayers),
        entryFee: parseFloat(data.entryFee),
        prizePool: data.prizePool,
        tournamentLevel: data.tournamentLevel,
      };
      await createTournament.mutateAsync(transformed as any);
    },
    onSuccess: () => {
      console.log("Tournament created successfully!");
    },
    onError: (error) => {
      console.error("Tournament creation error:", error);
    },
    showLoadingBar: true,
    enableAutoSave: true,
    autoSaveDelay: 2000,
    userId: user?.id,
  });

  const renderBasicInfoStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Information</h3>
        <p className="text-sm text-muted-foreground">
          Provide the essential details about your tournament.
        </p>
      </div>

      <FormInput
        label="Tournament Name"
        value={formState.data.name}
        onChange={(e) => formState.setField('name', e.target.value)}
        error={formState.errors.name}
        required
        placeholder="Enter tournament name"
        description="Choose a clear, descriptive name for your tournament"
      />

      <FormTextarea
        label="Description"
        value={formState.data.description}
        onChange={(e) => formState.setField('description', e.target.value)}
        error={formState.errors.description}
        required
        placeholder="Describe your tournament..."
        rows={4}
        description="Provide details about the tournament format, rules, and what players can expect"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Game"
          value={formState.data.gameId}
          onValueChange={(value) => formState.setField('gameId', value)}
          error={formState.errors.gameId}
          required
          placeholder="Select a game"
          options={games?.map((game) => ({
            value: game.id,
            label: game.name
          })) || []}
        />

        <FormSelect
          label="Store"
          value={formState.data.storeId}
          onValueChange={(value) => formState.setField('storeId', value)}
          error={formState.errors.storeId}
          required
          placeholder="Select a store"
          options={stores?.stores?.map((store) => ({
            value: store.id,
            label: store.name
          })) || []}
        />
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Tournament Details</h3>
        <p className="text-sm text-muted-foreground">
          Set the schedule, format, and participation details.
        </p>
      </div>

      <FormInput
        label="Tournament Date & Time"
        type="datetime-local"
        value={formState.data.date}
        onChange={(e) => formState.setField('date', e.target.value)}
        error={formState.errors.date}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormInput
          label="Max Players"
          type="text"
          value={formState.data.maxPlayers}
          onChange={(e) => formState.setField('maxPlayers', e.target.value)}
          error={formState.errors.maxPlayers}
          required
          placeholder="32"
        />

        <FormInput
          label="Entry Fee ($)"
          type="text"
          value={formState.data.entryFee}
          onChange={(e) => formState.setField('entryFee', e.target.value)}
          error={formState.errors.entryFee}
          placeholder="0"
        />

        <FormInput
          label="Prize Pool ($)"
          type="text"
          value={formState.data.prizePool}
          onChange={(e) => formState.setField('prizePool', e.target.value)}
          error={formState.errors.prizePool}
          placeholder="0"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Tournament Format"
          value={formState.data.format}
          onValueChange={(value) => formState.setField('format', value)}
          error={formState.errors.format}
          required
          options={[
            { value: 'swiss', label: 'Swiss' },
            { value: 'single-elimination', label: 'Single Elimination' },
            { value: 'double-elimination', label: 'Double Elimination' },
            { value: 'round-robin', label: 'Round Robin' }
          ]}
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
            { value: 'INTERNATIONAL', label: 'International' }
          ]}
        />
      </div>
    </div>
  );

  const renderSettingsStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Tournament Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure format and level.
        </p>
      </div>

      {/* Additional settings can be added here if schema expands */}
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Confirmation</h3>
        <p className="text-sm text-muted-foreground">
          Review your tournament details before creating.
        </p>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
        <h4 className="font-medium">Tournament Summary</h4>
        <div className="text-sm space-y-2">
          <p><strong>Name:</strong> {formState.data.name}</p>
          <p><strong>Game:</strong> {games?.find(g => g.id === formState.data.gameId)?.name}</p>
          <p><strong>Store:</strong> {stores?.stores?.find(s => s.id === formState.data.storeId)?.name}</p>
          <p><strong>Date:</strong> {formState.data.date ? new Date(formState.data.date).toLocaleString() : ''}</p>
          <p><strong>Max Players:</strong> {formState.data.maxPlayers}</p>
          <p><strong>Entry Fee:</strong> ${formState.data.entryFee}</p>
          <p><strong>Prize Pool:</strong> ${formState.data.prizePool}</p>
          <p><strong>Level:</strong> {formState.data.tournamentLevel}</p>
          <p><strong>Format:</strong> {formState.data.format}</p>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (formState.currentStepName) {
      case 'basic-info':
        return renderBasicInfoStep();
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

  if (!user || user.role !== 'organizer' && user.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">You don&apos;t have permission to create tournaments.</p>
          </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      closeOnOverlayClick={!formState.isSubmitting && !createTournament.isPending}
    >
      <ModalMultiStepForm
        title="Create Tournament"
        description="Set up a new tournament for players to compete in"
        currentStep={formState.currentStep}
        totalSteps={4}
        className={className}
      >
      <form onSubmit={formState.handleSubmit}>
        <FormStatus 
          success={createTournament.isSuccess ? "Tournament created successfully!" : undefined}
          error={createTournament.error?.message}
        />

        {renderStep()}

        <FormActions
            onSubmit={formState.submit}
          onCancel={onClose}
          isSubmitting={formState.isSubmitting || createTournament.isPending}
          isValid={formState.isValid}
          isDirty={formState.isDirty}
          submitLabel={
            formState.isLastStep 
              ? "Create Tournament" 
              : "Continue"
          }
          cancelLabel="Cancel"
          showCancel={true}
          showReset={false}
        />

        {/* Step Navigation */}
        {!formState.isFirstStep && (
          <div className="flex justify-start pt-4">
            <button
              type="button"
              onClick={formState.prevStep}
              className="text-sm text-muted-foreground hover:text-foreground"
              disabled={formState.isSubmitting}
            >
              ← Back to previous step
            </button>
          </div>
        )}
        </form>
      </ModalMultiStepForm>
    </Modal>
  );
}