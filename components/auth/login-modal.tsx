"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "./session-provider";
import { useSimpleZustandForm } from "@/hooks/use-form-zustand";
import { loginSchema, type LoginFormData } from "@/lib/validation/schemas";
import { ModalForm, FormInput, FormCheckbox, FormActions, FormStatus } from "../ui/form-components";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Mail, Lock } from "lucide-react";
import { transformError } from "@/lib/utils/error-transformer";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { signIn } = useSession();
  const [socialLoginLoading, setSocialLoginLoading] = useState<string | null>(null);

  // Don't show sign up link if we're on the sign-up page
  const showSignUpLink = pathname !== '/sign-up';

  // Initialize form state using Zustand-based form system with blur validation
  const formState = useSimpleZustandForm<LoginFormData>({
    initialData: {
      email: '',
      password: '',
      rememberMe: false,
    },
    validationSchema: loginSchema,
    validationTiming: 'blur', // Use blur validation timing
    validationDebounce: 300, // Add debouncing for responsive validation
    errorTransformer: (error) => {
      // Transform errors using the error transformation utility
      const transformed = transformError(error);
      return {
        field: transformed.field,
        message: transformed.message,
      };
    },
    onSubmit: async (data) => {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        // Log full error structure to understand Better Auth error format
        console.error("Login error details:", {
          error: result.error,
          errorType: typeof result.error,
          errorKeys: result.error ? Object.keys(result.error) : [],
          errorCode: (result.error as any)?.code,
          errorMessage: (result.error as any)?.message,
          errorStatus: (result.error as any)?.status,
          errorStatusText: (result.error as any)?.statusText,
          fullError: JSON.stringify(result.error, null, 2)
        });
        // Throw error to be handled by error transformer
        throw result.error;
      } else {
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
        onClose(); // Close modal on successful login
      }
    },
    onSuccess: () => {},
    onError: (error) => {
      // Error is already transformed and set as server error by the hook
      console.error("Login error:", error);
    },
    showLoadingBar: true,
  });

  const handleSocialLogin = async (provider: "google" | "discord" | "apple") => {
    setSocialLoginLoading(provider);
    
    try {
      await signIn.social({
        provider,
      });
      onClose(); // Close modal on successful social login
    } catch (error: unknown) {
      // Transform error using the error transformation utility
      const transformed = transformError(error);
      
      // Set as server error for proper display
      if (transformed.isFieldSpecific && transformed.field) {
        formState.setServerError(transformed.field as keyof LoginFormData, transformed.message);
      } else {
        // Set general error on email field for form-level errors
        formState.setServerError('email', transformed.message);
      }
    } finally {
      setSocialLoginLoading(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      closeOnOverlayClick={!formState.isSubmitting && !socialLoginLoading}
    >
      <ModalForm
        title="Welcome Back"
        description="Sign in to your account to continue"
          onSubmit={(e) => {
            e.preventDefault()
            // Blur any focused input to ensure errors clear properly
            if (document.activeElement instanceof HTMLInputElement) {
              document.activeElement.blur()
            }
            formState.submit()
          }}
      >
        {/* FormStatus shows general errors at the top of the form */}
        {/* Authentication errors are shown here to avoid confusion about which field is wrong */}
        <FormStatus 
          success={undefined}
          error={
            // Show general errors (like authentication errors)
            (formState.serverErrors as any).general || 
            (formState.displayErrors as any).general
          }
          errorType={
            // Authentication errors are user input errors, not server errors
            // Check if it's an authentication error to avoid "Server error:" prefix
            (() => {
              const generalError = (formState.serverErrors as any).general || (formState.displayErrors as any).general
              if (!generalError) return 'client'
              const lowerError = generalError.toLowerCase()
              const isAuthError = lowerError.includes('invalid email or password') ||
                                 lowerError.includes('invalid password') ||
                                 lowerError.includes('invalid credential')
              // Don't show "Server error:" for auth errors - they're user input validation
              return isAuthError ? 'client' : ((formState.serverErrors as any).general ? 'server' : 'client')
            })()
          }
        />

        <FormInput
          label="Email"
          type="email"
          value={formState.data.email}
          onChange={(e) => formState.setField('email', e.target.value)}
          onFocus={() => {
            // Clear general authentication error when user focuses on email field
            if ((formState.serverErrors as any).general) {
              formState.clearServerErrors()
            }
          }}
          onBlur={() => formState.handleBlur('email')}
          error={formState.displayErrors.email}
          errorType={formState.serverErrors.email ? 'server' : 'client'}
          required
          placeholder="Enter your email"
          icon={Mail}
        />

        <FormInput
          label="Password"
          type="password"
          value={formState.data.password}
          onChange={(e) => formState.setField('password', e.target.value)}
          onFocus={() => {
            // Clear general authentication error when user focuses on password field
            if ((formState.serverErrors as any).general) {
              formState.clearServerErrors()
            }
          }}
          onBlur={() => formState.handleBlur('password')}
          error={formState.displayErrors.password}
          errorType={formState.serverErrors.password ? 'server' : 'client'}
          required
          placeholder="Enter your password"
          icon={Lock}
        />

        <div className="flex items-center justify-between">
          <FormCheckbox
            label="Remember me"
            checked={formState.data.rememberMe}
            onCheckedChange={(checked) => formState.setField('rememberMe', checked)}
          />
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => {/* TODO: Implement forgot password */}}
          >
            Forgot password?
          </button>
        </div>

        {showSignUpLink && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => {
                  onClose();
                  router.push("/sign-up");
                }}
              >
                Sign up
              </button>
            </p>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin("google")}
            disabled={formState.isSubmitting || socialLoginLoading === "google"}
            className="w-full"
          >
            {socialLoginLoading === "google" ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin("discord")}
            disabled={formState.isSubmitting || socialLoginLoading === "discord"}
            className="w-full"
          >
            {socialLoginLoading === "discord" ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Continue with Discord
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin("apple")}
            disabled={formState.isSubmitting || socialLoginLoading === "apple"}
            className="w-full"
          >
            {socialLoginLoading === "apple" ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Continue with Apple
              </>
            )}
          </Button>
        </div>

        <FormActions
          onSubmit={formState.submit}
          onCancel={onClose}
          isSubmitting={formState.isSubmitting}
          isValid={formState.isValid}
          isDirty={formState.isDirty}
          submitLabel="Sign In"
          cancelLabel="Cancel"
          showReset={false}
          showCancel={true}
        />
      </ModalForm>
    </Modal>
  );
}
