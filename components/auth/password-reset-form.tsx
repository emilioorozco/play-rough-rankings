"use client";

import React from "react";
import { useSimpleZustandForm } from "@/hooks/use-form-zustand";
import { z } from "zod";
import { ModalForm, FormInput, FormActions, FormStatus } from "../ui/form-components";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { transformError } from "@/lib/utils/error-transformer";
import { trpc } from "@/lib/trpc/client";
import { Alert, AlertDescription } from "../ui/alert";

// Validation schema for password reset form
const passwordResetSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordResetData = z.infer<typeof passwordResetSchema>;

interface PasswordResetFormProps {
  token: string;
  onSuccess?: () => void;
}

export function PasswordResetForm({ token, onSuccess }: PasswordResetFormProps) {
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [tokenError, setTokenError] = React.useState<string | null>(null);
  
  // tRPC mutation for password reset
  const resetPassword = trpc.auth.resetPassword.useMutation();

  // Initialize form state using Zustand-based form system with blur validation
  const formState = useSimpleZustandForm<PasswordResetData>({
    initialData: {
      password: '',
      confirmPassword: '',
    },
    validationSchema: passwordResetSchema,
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
        await resetPassword.mutateAsync({ 
          token, 
          password: data.password 
        });
        
        // Show success message
        setSuccessMessage(
          "Your password has been successfully reset. You can now sign in with your new password."
        );
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.href = '/login';
          }
        }, 3000);
      } catch (error: any) {
        // Check if it's a token error
        const errorMessage = error?.message || '';
        if (errorMessage.toLowerCase().includes('expired') || 
            errorMessage.toLowerCase().includes('invalid token')) {
          setTokenError(errorMessage);
        } else {
          // Transform and throw error to be handled by error transformer
          throw error;
        }
      }
    },
    onSuccess: () => {},
    onError: (error) => {
      console.error("Password reset error:", error);
    },
    showLoadingBar: true,
  });

  // If token error, show error message
  if (tokenError) {
    return (
      <div className="space-y-4">
        <Alert className="border-destructive bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            {tokenError}
          </AlertDescription>
        </Alert>
        
        <p className="text-sm text-muted-foreground">
          Your password reset link has expired or is invalid. Please request a new password reset link.
        </p>
        
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 text-sm font-medium text-primary hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // If success message is shown, display it instead of the form
  if (successMessage) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-success/10 border border-success rounded-lg">
          <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-success font-medium mb-1">
              Password Reset Successful
            </p>
            <p className="text-sm text-muted-foreground">
              {successMessage}
            </p>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          Redirecting to login page...
        </p>
      </div>
    );
  }

  return (
    <ModalForm
      title="Create New Password"
      description="Enter your new password below"
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

      {/* Password strength requirements */}
      <div className="p-3 bg-muted/50 rounded-lg border border-border">
        <p className="text-sm font-medium mb-2">Password Requirements:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <span className={formState.data.password.length >= 8 ? "text-success" : ""}>
              {formState.data.password.length >= 8 ? "✓" : "○"}
            </span>
            At least 8 characters long
          </li>
          <li className="flex items-center gap-2">
            <span className={/[a-z]/.test(formState.data.password) ? "text-success" : ""}>
              {/[a-z]/.test(formState.data.password) ? "✓" : "○"}
            </span>
            Contains a lowercase letter
          </li>
          <li className="flex items-center gap-2">
            <span className={/[A-Z]/.test(formState.data.password) ? "text-success" : ""}>
              {/[A-Z]/.test(formState.data.password) ? "✓" : "○"}
            </span>
            Contains an uppercase letter
          </li>
          <li className="flex items-center gap-2">
            <span className={/[0-9]/.test(formState.data.password) ? "text-success" : ""}>
              {/[0-9]/.test(formState.data.password) ? "✓" : "○"}
            </span>
            Contains a number
          </li>
        </ul>
      </div>

      <FormInput
        label="New Password"
        type="password"
        value={formState.data.password}
        onChange={(e) => formState.setField('password', e.target.value)}
        onFocus={() => {
          if ((formState.serverErrors as any).general) {
            formState.clearServerErrors();
          }
        }}
        onBlur={() => formState.handleBlur('password')}
        error={formState.displayErrors.password}
        errorType={formState.serverErrors.password ? 'server' : 'client'}
        required
        placeholder="Enter your new password"
        icon={Lock}
      />

      <FormInput
        label="Confirm New Password"
        type="password"
        value={formState.data.confirmPassword}
        onChange={(e) => formState.setField('confirmPassword', e.target.value)}
        onFocus={() => {
          if ((formState.serverErrors as any).general) {
            formState.clearServerErrors();
          }
        }}
        onBlur={() => formState.handleBlur('confirmPassword')}
        error={formState.displayErrors.confirmPassword}
        errorType={formState.serverErrors.confirmPassword ? 'server' : 'client'}
        required
        placeholder="Confirm your new password"
        icon={Lock}
      />

      <FormActions
        onSubmit={formState.submit}
        isSubmitting={formState.isSubmitting}
        isValid={formState.isValid}
        isDirty={formState.isDirty}
        submitLabel="Reset Password"
        showReset={false}
        showCancel={false}
      />
    </ModalForm>
  );
}
