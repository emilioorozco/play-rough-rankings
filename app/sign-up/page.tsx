"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import { useZustandFormSteps } from "@/hooks/use-form-zustand";
import { registerSchema } from "@/lib/validation/schemas";
import { FormInput, FormSelect, FormCheckbox, FormStatus } from "@/components/ui/form-components";
import { Modal } from "@/components/ui/modal";
import { Mail, Lock, User, Eye, EyeOff, Info } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useSession();
  
  const steps = ['personal-info', 'account-info', 'preferences'];
  
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
      } else {
        router.push("/");
      }
    },
    onSuccess: () => {},
    onError: () => {},
    showLoadingBar: true,
    enableAutoSave: true,
    autoSaveDelay: 2000,
  });

  // UI state for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get step state from formState
  const currentStepName = formState.currentStepName;
  const isFirstStep = formState.isFirstStep;
  const isLastStep = formState.isLastStep;


  const renderPersonalInfoStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Personal Information</h3>
        <p className="text-sm text-muted-foreground mb-4">
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
      <div>
        <h3 className="text-lg font-medium mb-2">Account Information</h3>
        <p className="text-sm text-muted-foreground mb-4">
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
      <div>
        <h3 className="text-lg font-medium mb-2">Preferences</h3>
        <p className="text-sm text-muted-foreground mb-4">
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

  // Render modal children directly so form field updates re-render immediately

  return (
    <main className="bg-background text-foreground min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <Modal
          isOpen={true}
          onClose={() => {}} // No-op since this is a page, not a modal
          title="Create Account"
          description="Join the community and start competing"
          size="lg"
          showCloseButton={false}
          closeOnOverlayClick={false}
          usePortal={false}
          isMultiStep={true}
          currentStep={formState.currentStep}
          totalSteps={formState.totalSteps}
          onSubmit={isLastStep ? formState.submit : formState.nextStep}
          onCancel={formState.prevStep}
          isSubmitting={formState.isSubmitting}
          isValid={formState.isCurrentStepValid}
          isDirty={formState.isDirty}
          submitLabel={isLastStep ? "Create Account" : "Continue"}
          cancelLabel="Back"
          showCancel={!isFirstStep}
          showReset={false}
        >
          <>
            <FormStatus 
              error={formState.errors.email || formState.errors.password || formState.errors.username || (formState.errors as any).general}
            />
            {renderCurrentStep()}
          </>
        </Modal>
      </div>
    </main>
  );
}
