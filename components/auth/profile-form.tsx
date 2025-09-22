"use client";

import React, { useEffect } from "react";
import { useSession } from "./session-provider";
import { useFormState } from "@/hooks/useFormState";
import { profileUpdateSchema, type ProfileUpdateFormData } from "@/lib/validation/schemas";
import { ModalForm, FormInput, FormSelect, FormActions, FormStatus } from "../ui/form-components";
import { Modal } from "../ui/modal";
import { useTRPCMutationWithLoading } from "@/hooks/useTRPCWithLoading";
import { trpc } from "@/lib/trpc/client";

interface ProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export function ProfileForm({ isOpen, onClose, onSave }: ProfileFormProps) {
  const { user, updateSession } = useSession();

  // Profile update mutation with enhanced error handling
  const updateProfile = useTRPCMutationWithLoading(
    'update-profile',
    () => trpc.user.updateProfile.useMutation(),
    {
      onSuccess: () => {
        updateSession();
        onSave?.();
        onClose();
      },
      onError: (error) => {
        console.error(`Failed to update profile: ${error instanceof Error ? error.message : String(error)}`);
      },
    }
  );

  // Initialize form state
  const formState = useFormState<ProfileUpdateFormData>({
    initialData: {
      name: '',
      email: '',
      firstName: '',
      lastName: '',
      location: '',
      phone: '',
      bio: '',
    },
    validationSchema: profileUpdateSchema,
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
        name: user.name || '',
        email: user.email || '',
        firstName: (user as any).firstName || '',
        lastName: (user as any).lastName || '',
        location: (user as any).location || '',
        phone: (user as any).phone || '',
        bio: (user as any).bio || '',
      });
    }
  }, [user, formState.setFields]);

  if (!user) {
    return (
      <div className="text-center">
        <p>Please sign in to manage your profile.</p>
      </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      closeOnOverlayClick={!formState.isSubmitting && !updateProfile.isLoading}
    >
      <ModalForm
        title="Profile Settings"
        description="Update your profile information and preferences"
        onSubmit={formState.handleSubmit}
      >
      <FormStatus 
        success={updateProfile.isSuccess ? "Profile updated successfully!" : undefined}
        error={updateProfile.error?.message}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="First Name"
          value={formState.data.firstName}
          onChange={(e) => formState.setField('firstName', e.target.value)}
          error={formState.errors.firstName}
          placeholder="Enter your first name"
        />

        <FormInput
          label="Last Name"
          value={formState.data.lastName}
          onChange={(e) => formState.setField('lastName', e.target.value)}
          error={formState.errors.lastName}
          placeholder="Enter your last name"
        />
      </div>

      <FormInput
        label="Display Name"
        value={formState.data.name}
        onChange={(e) => formState.setField('name', e.target.value)}
        error={formState.errors.name}
        placeholder="Enter your display name"
        description="This is how your name will appear to other users"
      />

      <FormInput
        label="Email"
        type="email"
        value={formState.data.email}
        onChange={(e) => formState.setField('email', e.target.value)}
        error={formState.errors.email}
        placeholder="Enter your email"
        description="We'll use this to send you important updates"
      />

      <FormInput
        label="Location"
        value={formState.data.location}
        onChange={(e) => formState.setField('location', e.target.value)}
        error={formState.errors.location}
        placeholder="City, State/Country"
        description="Help other players find tournaments in your area"
      />

      <FormInput
        label="Phone Number"
        type="tel"
        value={formState.data.phone}
        onChange={(e) => formState.setField('phone', e.target.value)}
        error={formState.errors.phone}
        placeholder="Enter your phone number"
        description="Optional - for tournament organizers to contact you"
      />

      <FormInput
        label="Bio"
        value={formState.data.bio}
        onChange={(e) => formState.setField('bio', e.target.value)}
        error={formState.errors.bio}
        placeholder="Tell us about yourself..."
        description="A brief description about yourself and your gaming interests"
      />

      <FormActions
        onSubmit={formState.submit}
        onReset={formState.reset}
        onCancel={onClose}
        isSubmitting={formState.isSubmitting || updateProfile.isLoading}
        isValid={formState.isValid}
        isDirty={formState.isDirty}
        submitLabel="Save Changes"
        resetLabel="Reset Changes"
        cancelLabel="Cancel"
        showReset={true}
        showCancel={true}
      />
      </ModalForm>
    </Modal>
  );
}