"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useFormSteps } from "@/hooks/useFormState";
import { tournamentCreateSchema, type TournamentCreateFormData } from "@/lib/validation/schemas";
import { ModalMultiStepForm, FormInput, FormTextarea, FormSelect, FormCheckbox, FormActions, FormStatus } from "../ui/form-components";
import { Modal } from "../ui/modal";
import { useTRPCMutationWithLoading } from "@/hooks/useTRPCWithLoading";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "@/components/auth/session-provider";

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

  // Load available games and venues
  const { data: games } = trpc.games.list.useQuery({ includeInactive: false });
  const { data: venues } = trpc.venues.list.useQuery();

  // Create tournament mutation
  const createTournament = useTRPCMutationWithLoading(
    'create-tournament',
    () => trpc.tournaments.create.useMutation(),
    {
      onSuccess: (data) => {
        onSuccess?.();
        onClose();
        router.push(`/tournaments/${data.id}`);
      },
      onError: (error) => {
        console.error("Tournament creation failed:", error);
      },
    }
  );

  // Multi-step form state
  const formState = useFormSteps<TournamentCreateFormData>({
    steps: ['basic-info', 'details', 'settings', 'confirmation'],
    initialData: {
      name: '',
      description: '',
      gameId: '',
      venueId: '',
      startDate: '',
      endDate: '',
      maxParticipants: 32,
      entryFee: 0,
      prizePool: 0,
      level: 'LOCAL',
      format: 'SWISS',
      isPublic: true,
      allowRegistration: true,
      requireApproval: false,
      rules: '',
      contactInfo: '',
    },
    validationSchemas: {
      'basic-info': tournamentCreateSchema.pick({
        name: true,
        description: true,
        gameId: true,
        venueId: true,
      }),
      'details': tournamentCreateSchema.pick({
        startDate: true,
        endDate: true,
        maxParticipants: true,
        entryFee: true,
        prizePool: true,
        level: true,
        format: true,
      }),
      'settings': tournamentCreateSchema.pick({
        isPublic: true,
        allowRegistration: true,
        requireApproval: true,
        rules: true,
        contactInfo: true,
      }),
      'confirmation': tournamentCreateSchema,
    },
    onSubmit: async (data) => {
      await createTournament.mutateAsync(data);
    },
    onSuccess: () => {
      console.log("Tournament created successfully!");
    },
    onError: (error) => {
      console.error("Tournament creation error:", error);
    },
    showLoadingBar: true,
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
          label="Venue"
          value={formState.data.venueId}
          onValueChange={(value) => formState.setField('venueId', value)}
          error={formState.errors.venueId}
          required
          placeholder="Select a venue"
          options={venues?.map((venue) => ({
            value: venue.id,
            label: venue.name
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Start Date & Time"
          type="datetime-local"
          value={formState.data.startDate}
          onChange={(e) => formState.setField('startDate', e.target.value)}
          error={formState.errors.startDate}
          required
        />

        <FormInput
          label="End Date & Time"
          type="datetime-local"
          value={formState.data.endDate}
          onChange={(e) => formState.setField('endDate', e.target.value)}
          error={formState.errors.endDate}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormInput
          label="Max Participants"
          type="number"
          value={formState.data.maxParticipants}
          onChange={(e) => formState.setField('maxParticipants', parseInt(e.target.value))}
          error={formState.errors.maxParticipants}
          required
          min={2}
          max={256}
        />

        <FormInput
          label="Entry Fee ($)"
          type="number"
          value={formState.data.entryFee}
          onChange={(e) => formState.setField('entryFee', parseFloat(e.target.value))}
          error={formState.errors.entryFee}
          min={0}
          step={0.01}
        />

        <FormInput
          label="Prize Pool ($)"
          type="number"
          value={formState.data.prizePool}
          onChange={(e) => formState.setField('prizePool', parseFloat(e.target.value))}
          error={formState.errors.prizePool}
          min={0}
          step={0.01}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Tournament Level"
          value={formState.data.level}
          onValueChange={(value) => formState.setField('level', value)}
          error={formState.errors.level}
          required
          options={[
            { value: "LOCAL", label: "Local" },
            { value: "REGIONAL", label: "Regional" },
            { value: "NATIONAL", label: "National" },
            { value: "INTERNATIONAL", label: "International" }
          ]}
        />

        <FormSelect
          label="Tournament Format"
          value={formState.data.format}
          onValueChange={(value) => formState.setField('format', value)}
          error={formState.errors.format}
          required
          options={[
            { value: "SWISS", label: "Swiss" },
            { value: "SINGLE_ELIMINATION", label: "Single Elimination" },
            { value: "DOUBLE_ELIMINATION", label: "Double Elimination" },
            { value: "ROUND_ROBIN", label: "Round Robin" }
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
          Configure visibility, registration, and other settings.
        </p>
      </div>

      <div className="space-y-4">
        <FormCheckbox
          label="Public Tournament"
          description="Make this tournament visible to all users"
          checked={formState.data.isPublic}
          onCheckedChange={(checked) => formState.setField('isPublic', checked)}
          error={formState.errors.isPublic}
        />

        <FormCheckbox
          label="Allow Registration"
          description="Allow players to register for this tournament"
          checked={formState.data.allowRegistration}
          onCheckedChange={(checked) => formState.setField('allowRegistration', checked)}
          error={formState.errors.allowRegistration}
        />

        <FormCheckbox
          label="Require Approval"
          description="Manually approve all registrations"
          checked={formState.data.requireApproval}
          onCheckedChange={(checked) => formState.setField('requireApproval', checked)}
          error={formState.errors.requireApproval}
        />
      </div>

      <FormTextarea
        label="Tournament Rules"
        value={formState.data.rules}
        onChange={(e) => formState.setField('rules', e.target.value)}
        error={formState.errors.rules}
        placeholder="Enter tournament rules and regulations..."
        rows={4}
        description="Specify any special rules, deck restrictions, or tournament-specific regulations"
      />

      <FormInput
        label="Contact Information"
        value={formState.data.contactInfo}
        onChange={(e) => formState.setField('contactInfo', e.target.value)}
        error={formState.errors.contactInfo}
        placeholder="Email or phone number for questions"
        description="How players can contact you with questions about the tournament"
      />
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
          <p><strong>Venue:</strong> {venues?.find(v => v.id === formState.data.venueId)?.name}</p>
          <p><strong>Start:</strong> {new Date(formState.data.startDate).toLocaleString()}</p>
          <p><strong>End:</strong> {new Date(formState.data.endDate).toLocaleString()}</p>
          <p><strong>Max Participants:</strong> {formState.data.maxParticipants}</p>
          <p><strong>Entry Fee:</strong> ${formState.data.entryFee}</p>
          <p><strong>Prize Pool:</strong> ${formState.data.prizePool}</p>
          <p><strong>Level:</strong> {formState.data.level}</p>
          <p><strong>Format:</strong> {formState.data.format}</p>
          <p><strong>Public:</strong> {formState.data.isPublic ? 'Yes' : 'No'}</p>
          <p><strong>Allow Registration:</strong> {formState.data.allowRegistration ? 'Yes' : 'No'}</p>
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
        <p className="text-muted-foreground">You don't have permission to create tournaments.</p>
          </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      closeOnOverlayClick={!formState.isSubmitting && !createTournament.isLoading}
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
          isSubmitting={formState.isSubmitting || createTournament.isLoading}
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
              onClick={formState.goToPreviousStep}
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