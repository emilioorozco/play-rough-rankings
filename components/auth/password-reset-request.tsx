"use client";

import React from "react";
import { useSimpleZustandForm } from "@/hooks/use-form-zustand";
import { z } from "zod";
import { ModalForm, FormInput, FormActions, FormStatus } from "../ui/form-components";
import { Mail, CheckCircle } from "lucide-react";
import { transformError } from "@/lib/utils/error-transformer";
import { trpc } from "@/lib/trpc/client";

// Validation schema for password reset request
const passwordResetRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>;

interface PasswordResetRequestProps {
  onClose?: () => void;
}

export function PasswordResetRequest({ onClose }: PasswordResetRequestProps) {
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  
  // tRPC mutation for password reset request
  const requestPasswordReset = trpc.auth.requestPasswordReset.useMutation();

  // Initialize form state using Zustand-based form system with blur validation
  const formState = useSimpleZustandForm<PasswordResetRequestData>({
    initialData: {
      email: '',
    },
    validationSchema: passwordResetRequestSchema,
    validationTiming: 'blur',
    validationDebounce: 300,
    errorTransformer: (error) => {
      const transformed = transformError(error);
      return {
        field: transformed.field,
        message: transformed.message,
      };
    },
    onSubmit: async (data) => {
      try {
        await requestPasswordReset.mutateAsync({ email: data.email });
        
        // Always show success message for security (even if email doesn't exist)
        setSuccessMessage(
          "If an account exists with this email address, you will receive a password reset link shortly. Please check your inbox."
        );
        
        // Clear the form
        formState.reset();
      } catch (error) {
        // Transform and throw error to be handled by error transformer
        throw error;
      }
    },
    onSuccess: () => {},
    onError: (error) => {
      console.error("Password reset request error:", error);
    },
    showLoadingBar: true,
  });

  // If success message is shown, display it instead of the form
  if (successMessage) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-success/10 border border-success rounded-lg">
          <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-success font-medium mb-1">
              Password Reset Email Sent
            </p>
            <p className="text-sm text-muted-foreground">
              {successMessage}
            </p>
          </div>
        </div>
        
        {onClose && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-primary hover:underline"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ModalForm
      title="Reset Your Password"
      description="Enter your email address and we'll send you a link to reset your password"
      onSubmit={(e) => {
        e.preventDefault();
        // Blur any focused input to ensure errors clear properly
        if (document.activeElement instanceof HTMLInputElement) {
          document.activeElement.blur();
        }
        formState.submit();
      }}
    >
      <FormStatus 
        success={undefined}
        error={
          (formState.serverErrors as any).general || 
          (formState.displayErrors as any).general
        }
        errorType={
          (formState.serverErrors as any).general ? 'server' : 'client'
        }
      />

      <FormInput
        label="Email"
        type="email"
        value={formState.data.email}
        onChange={(e) => formState.setField('email', e.target.value)}
        onFocus={() => {
          if ((formState.serverErrors as any).general) {
            formState.clearServerErrors();
          }
        }}
        onBlur={() => formState.handleBlur('email')}
        error={formState.displayErrors.email}
        errorType={formState.serverErrors.email ? 'server' : 'client'}
        required
        placeholder="Enter your email address"
        icon={Mail}
        description="We'll send a password reset link to this email address"
      />

      <FormActions
        onSubmit={formState.submit}
        onCancel={onClose}
        isSubmitting={formState.isSubmitting}
        isValid={formState.isValid}
        isDirty={formState.isDirty}
        submitLabel="Send Reset Link"
        cancelLabel="Cancel"
        showReset={false}
        showCancel={!!onClose}
      />
    </ModalForm>
  );
}
