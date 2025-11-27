"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import { useZustandFormSteps } from "@/hooks/use-form-zustand";
import { registerSchema } from "@/lib/validation/schemas";
import { FormInput, FormSelect, FormCheckbox, FormStatus } from "@/components/ui/form-components";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDraftIdByFormId, useFormDraftActions } from "@/stores/form-draft-store-selectors";
import { cn } from "@/lib/utils";
import { Mail, Lock, User, Eye, EyeOff, Info, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, user, isLoading, refetch } = useSession();
  
  const steps = ['personal-info', 'account-info', 'preferences'];
  
  // Get draft ID and actions for cleanup
  const draftId = useDraftIdByFormId('user-registration');
  const actions = useFormDraftActions();
  
  // Redirect logged-in users away from sign-up page
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);
  
  // Multi-step form state using Zustand
  const formState = useZustandFormSteps({
    steps,
    formId: 'user-registration',
    formType: 'user-registration',
    initialData: {
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
      subscribeToUpdates: false,
      nameDisplayPreference: 'DISPLAY_NAME',
      optInCommunications: false,
    },
    validationSchemas: {
      'personal-info': registerSchema.pick({
        username: true,
        firstName: true,
        lastName: true,
      }),
      'account-info': registerSchema.pick({
        email: true,
        password: true,
        confirmPassword: true,
      }),
      'preferences': registerSchema.pick({
        agreeToTerms: true,
        subscribeToUpdates: true,
        nameDisplayPreference: true,
        optInCommunications: true,
      }),
    },
    onSubmit: async (data) => {
      const result = await signUp.email({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        name: data.username || [data.firstName, data.lastName].filter(Boolean).join(" ") || data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        nameDisplayPreference: data.nameDisplayPreference,
        optInCommunications: data.optInCommunications,
        subscribeToUpdates: data.subscribeToUpdates,
      } as any);

      if (result.error) {
        
        // Provide more specific error messages
        let errorMessage = result.error.message || "Registration failed";
        
        // Handle common Better Auth error cases
        if (errorMessage.toLowerCase().includes("invalid email")) {
          errorMessage = "This email address is already registered or invalid. Please try a different email address.";
        } else if (errorMessage.toLowerCase().includes("user already exists") || errorMessage.toLowerCase().includes("email already exists")) {
          errorMessage = "An account with this email address already exists. Please sign in instead.";
        } else if (errorMessage.toLowerCase().includes("password")) {
          errorMessage = "Password requirements not met. Please ensure your password is at least 8 characters long.";
        }
        
        throw new Error(errorMessage);
      }
      // Success - cleanup will happen in onSuccess callback
    },
    onSuccess: async () => {
      // Cleanup draft data on successful registration
      if (draftId) {
        formState.reset();
        actions.deleteDraft(draftId);
      }
      // Refetch session to ensure we have the updated user data
      await refetch();
      // Use window.location for a hard redirect to ensure we get the updated session
      // This forces a full page reload which ensures the session is properly set
      window.location.href = "/";
    },
    onError: () => {},
    showLoadingBar: true,
    enableAutoSave: true,
    autoSaveDelay: 2000,
  });
  
  // Reset step to 0 on component mount (always start at step 1)
  useEffect(() => {
    // Always reset to step 0 on mount, regardless of draft state
    formState.goToStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - we intentionally don't include formState to avoid re-running

  // Slide animation state (similar to modal)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | 'none'>('none')
  const previousStepRef = useRef(formState.currentStep)
  const contentRef = useRef<HTMLDivElement>(null)

  // Track step changes for slide direction
  useEffect(() => {
    const previousStep = previousStepRef.current
    const currentStep = formState.currentStep
    
    if (previousStep !== currentStep) {
      if (currentStep > previousStep) {
        setSlideDirection('left') // Moving forward - slide left
      } else if (currentStep < previousStep) {
        setSlideDirection('right') // Moving backward - slide right
      }
      previousStepRef.current = currentStep
      
      // Reset slide direction after animation
      const timer = setTimeout(() => {
        setSlideDirection('none')
      }, 300) // Match animation duration
      
      return () => clearTimeout(timer)
    }
  }, [formState.currentStep])

  // UI state for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get step state from formState
  const currentStepName = formState.currentStepName;
  const isFirstStep = formState.isFirstStep;
  const isLastStep = formState.isLastStep;


  const renderPersonalInfoStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Personal Information</h3>
        <p className="text-sm text-muted-foreground">
          Tell us a bit about yourself
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
          icon={User}
        />

        <FormInput
          label="Last Name"
          value={formState.data.lastName}
          onChange={(e) => formState.setField('lastName', e.target.value)}
          error={formState.errors.lastName}
          required
          placeholder="Enter your last name"
          icon={User}
        />
      </div>

      <FormInput
        label="Username"
        value={formState.data.username}
        onChange={(e) => formState.setField('username', e.target.value)}
        error={formState.errors.username}
        required
        placeholder="Choose a username"
        icon={User}
      />

    </div>
  );

  const renderAccountInfoStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Account Information</h3>
        <p className="text-sm text-muted-foreground">
          Create your account credentials
        </p>
      </div>

      <FormInput
        label="Email"
        type="email"
        value={formState.data.email}
        onChange={(e) => formState.setField('email', e.target.value)}
        error={formState.errors.email}
        required
        placeholder="Enter your email"
        icon={Mail}
      />

        <FormInput
          label="Password"
          type={showPassword ? "text" : "password"}
          value={formState.data.password}
          onChange={(e) => formState.setField('password', e.target.value)}
          error={formState.errors.password}
          required
          placeholder="Create a password"
          icon={Lock}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <FormInput
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          value={formState.data.confirmPassword}
          onChange={(e) => formState.setField('confirmPassword', e.target.value)}
          error={formState.errors.confirmPassword}
          required
          placeholder="Confirm your password"
          icon={Lock}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
    </div>
  );

  const renderPreferencesStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Set your account preferences
        </p>
      </div>

      <div className="space-y-4">
        <FormSelect
          label="Name Display Preference"
          description="Choose how your name appears on leaderboards and in tournaments"
          value={formState.data.nameDisplayPreference}
          onValueChange={(value) => formState.setField('nameDisplayPreference', value)}
          error={formState.errors.nameDisplayPreference}
          required
          options={[
            {
              value: 'FIRST_NAME',
              label: 'First Name Only'
            },
            {
              value: 'FIRST_LAST_NAME',
              label: 'First + Last Name'
            },
            {
              value: 'DISPLAY_NAME',
              label: 'Display Name (Username)'
            },
            {
              value: 'OPT_OUT',
              label: 'Opt Out (Private)'
            }
          ]}
        />

        <FormCheckbox
          label="Subscribe to updates and notifications"
          checked={formState.data.subscribeToUpdates}
          onCheckedChange={(checked) => formState.setField('subscribeToUpdates', checked)}
          error={formState.errors.subscribeToUpdates}
        />

        <FormCheckbox
          label="Receive general platform updates and announcements"
          checked={formState.data.optInCommunications}
          onCheckedChange={(checked) => formState.setField('optInCommunications', checked)}
          error={formState.errors.optInCommunications}
        />

        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">More notification options available</p>
              <p>You can customize your notification preferences in detail after creating your account, including tournament updates, leaderboard notifications, and marketing communications.</p>
            </div>
          </div>
        </div>

        <FormCheckbox
          label="I agree to the Terms of Service and Privacy Policy"
          checked={formState.data.agreeToTerms}
          onCheckedChange={(checked) => formState.setField('agreeToTerms', checked)}
          error={formState.errors.agreeToTerms}
          required
        />
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStepName) {
      case 'personal-info':
        return renderPersonalInfoStep();
      case 'account-info':
        return renderAccountInfoStep();
      case 'preferences':
        return renderPreferencesStep();
      default:
        return null;
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Don't render sign-up form if user is already logged in
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <Card className="max-w-2xl mx-auto bg-background">
          {/* Card Header with Progress */}
          <CardHeader className="p-0">
            <div className="relative">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex-1">
                  <CardTitle className="mb-2 text-foreground text-lg font-semibold">
                    Create Your Account
                  </CardTitle>
                  <CardDescription>
                    Join the community and start competing
                  </CardDescription>
                </div>
              </div>
              {/* Multi-step progress bar on top of divider - matching modal pattern exactly */}
              {(() => {
                const isLastStep = formState.currentStep === formState.totalSteps - 1
                const baseProgress = isLastStep && formState.isSubmitting 
                  ? 100 
                  : Math.min((formState.currentStep / formState.totalSteps) * 100 + (100 / formState.totalSteps / 2), 90)
                
                return (
                  <div className="absolute -bottom-px left-0 right-0 h-1 bg-muted">
                    <div 
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ 
                        width: `${baseProgress}%`,
                        transition: 'width 500ms ease-out'
                      }}
                    />
                  </div>
                )
              })()}
            </div>
          </CardHeader>
          
          {/* Card Content with Form */}
          <CardContent className="pt-6">
            <form 
              id="signup-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (isLastStep) {
                  formState.submit();
                } else {
                  // Validate current step before proceeding
                  if (formState.isCurrentStepValid) {
                    formState.nextStep();
                  }
                }
              }}
            >
              <FormStatus 
                error={formState.errors.email || formState.errors.password || formState.errors.username || (formState.errors as any).general}
              />
              {/* Step content with slide animation */}
              <div 
                ref={contentRef}
                className={cn(
                  "relative overflow-x-visible",
                  slideDirection === 'left' && "animate-slide-left",
                  slideDirection === 'right' && "animate-slide-right"
                )}
              >
                {renderCurrentStep()}
              </div>
            </form>
          </CardContent>
          
          {/* Card Footer with Actions */}
          <CardFooter className="flex items-center justify-between gap-3 pt-6 border-t">
            {!isFirstStep && (
              <Button
                type="button"
                variant="outline"
                onClick={formState.prevStep}
                disabled={formState.isSubmitting}
              >
                Back
              </Button>
            )}
            <div className="flex-1" /> {/* Spacer */}
            <Button
              type="submit"
              form="signup-form"
              disabled={formState.isSubmitting || !formState.isCurrentStepValid}
              className="ml-auto"
            >
              {formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLastStep ? "Creating Account..." : "Loading..."}
                </>
              ) : (
                isLastStep ? "Create Account" : "Continue"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
