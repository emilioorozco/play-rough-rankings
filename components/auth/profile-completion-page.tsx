"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "@/hooks/useFormState";
import { profileCompletionSchema } from "@/lib/validation/schemas";
import type { ProfileCompletionFormData } from "@/lib/validation/schemas";
import { Form, FormInput, FormSelect, FormActions, FormStatus } from "../ui/form-components";
import { useTRPCMutationWithLoading } from "@/hooks/useTRPCWithLoading";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "./session-provider";

interface ProfileCompletionPageProps {
  className?: string;
}

export function ProfileCompletionPage({ className }: ProfileCompletionPageProps) {
  const { user, refetch } = useSession();
  const router = useRouter();

  // Load available games
  const { data: games } = trpc.games.list.useQuery({ includeInactive: false });

  // Update user profile mutation
  const updateProfile = useTRPCMutationWithLoading(
    'update-profile-completion',
    () => trpc.user.updateProfile.useMutation(),
    {
      onSuccess: () => {
        refetch();
        router.push("/");
      },
      onError: (error) => {
        console.error(`Failed to complete profile: ${error instanceof Error ? error.message : String(error)}`);
      },
    }
  );

  // Initialize form state
  const formState = useFormState<ProfileCompletionFormData>({
    initialData: {
      firstName: '',
      lastName: '',
      location: '',
      favoriteGame: '',
    },
    validationSchema: profileCompletionSchema,
    onSubmit: async (data) => {
      await updateProfile.mutateAsync(data);
    },
    onSuccess: () => {
      // Success is handled by the mutation's onSuccess callback
    },
    onError: (error) => {
      console.error("Form submission error:", error);
    },
    showLoadingBar: true,
  });

  // Update form data when user data is available
  useEffect(() => {
    if (user) {
      formState.setFields({
        firstName: (user as any).firstName || '',
        lastName: (user as any).lastName || '',
        location: (user as any).location || '',
        favoriteGame: (user as any).favoriteGame || '',
      });
    }
  }, [user, formState.setFields]);

  if (!user) {
    return (
      <div className="text-center">
        <p>Please sign in to complete your profile.</p>
      </div>
    );
  }

  return (
    <Form
      title="Complete Your Profile"
      description="Just a few more details to get you started"
      className={className}
      onSubmit={formState.handleSubmit}
    >
      <FormStatus 
        success={updateProfile.isSuccess ? "Profile completed successfully!" : undefined}
        error={updateProfile.error?.message}
      />

      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Welcome to Play Rough Rankings!</h2>
          <p className="text-muted-foreground">
            Let's complete your profile so you can start participating in tournaments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="First Name"
            value={formState.data.firstName}
            onChange={(e) => formState.setField('firstName', e.target.value)}
            error={formState.errors.firstName}
            required
            placeholder="Enter your first name"
          />

          <FormInput
            label="Last Name"
            value={formState.data.lastName}
            onChange={(e) => formState.setField('lastName', e.target.value)}
            error={formState.errors.lastName}
            required
            placeholder="Enter your last name"
          />
        </div>

        <FormInput
          label="Location"
          value={formState.data.location}
          onChange={(e) => formState.setField('location', e.target.value)}
          error={formState.errors.location}
          placeholder="City, State/Country"
          description="Help other players find tournaments in your area"
        />

        <FormSelect
          label="Favorite Game"
          value={formState.data.favoriteGame}
          onChange={(e) => formState.setField('favoriteGame', e.target.value)}
          error={formState.errors.favoriteGame}
          options={games?.map(game => ({ value: game.id, label: game.name })) || []}
          placeholder="Select your favorite game"
          description="This helps us recommend relevant tournaments"
        />

        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-semibold mb-2">What's Next?</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Browse and register for tournaments</li>
            <li>• Track your performance and rankings</li>
            <li>• Connect with other players in your area</li>
            <li>• Create your own tournaments (if you're an organizer)</li>
          </ul>
        </div>
      </div>

      <FormActions
        onSubmit={formState.submit}
        isSubmitting={formState.isSubmitting || updateProfile.isLoading}
        isValid={formState.isValid}
        isDirty={formState.isDirty}
        submitLabel="Complete Profile"
        showReset={false}
        showCancel={false}
      />
    </Form>
  );
}
