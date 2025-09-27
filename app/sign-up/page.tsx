"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import { useFormDraftIntegration } from "@/stores/form-draft-integration";
import { useFormDraftStore } from "@/stores/form-draft-store";
import { registerSchema } from "@/lib/validation/schemas";
import { FormInput, FormSelect, FormCheckbox, FormStatus } from "@/components/ui/form-components";
import { Modal } from "@/components/ui/modal";
import { Mail, Lock, User, Eye, EyeOff, Info } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useSession();
  
  const formId = 'user-registration';
  const formType = 'user-registration';
  const steps = ['personal-info', 'account-info', 'preferences'];
  
  // Form integration hook
  const {
    formData,
    draftErrors,
    isSubmitting,
    updateField,
    submit,
    validate,
    clearDraft,
  } = useFormDraftIntegration(formId, formType, registerSchema);

  // Import updateDraftStep from the store
  const { updateDraftStep } = useFormDraftStore();

  // UI state for password visibility (local state for now)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Resolve the actual draft by metadata.formId so we can use the internal draftId
  const draftEntry = useFormDraftStore((state) => {
    const drafts = state.drafts as Record<string, any>;
    return Object.values(drafts).find((d: any) => d?.metadata?.formId === formId) as any;
  });
  const draftId = draftEntry?.id as string | undefined;
  const currentStep = draftEntry?.currentStep || 0;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[RegisterPage] draft resolution', { formId, draftId, currentStep, hasDraft: !!draftEntry });
  }

  // Draft initialization is now handled by the integration hook
  // The form will render with default values and create the draft when user starts typing

  // updateField is now provided by useFormDraftIntegration

  // Step management
  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      if (draftId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[RegisterPage] update step next', { draftId, from: currentStep, to: currentStep + 1 });
        }
        updateDraftStep(draftId, currentStep + 1);
      }
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      if (draftId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[RegisterPage] update step prev', { draftId, from: currentStep, to: currentStep - 1 });
        }
        updateDraftStep(draftId, currentStep - 1);
      }
    }
  };

  const currentStepName = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;


  // Validation is now handled by useFormDraftIntegration

  const isFormValid = () => {
    return formData.username && formData.username.length >= 3 &&
           formData.firstName && formData.lastName &&
           formData.email &&
           formData.password && formData.password.length >= 8 &&
           formData.password === formData.confirmPassword &&
           formData.agreeToTerms === true;
  };

  const isCurrentStepValid = () => {
    if (currentStepName === 'personal-info') {
      return formData.username && formData.username.length >= 3 && 
             formData.firstName && formData.lastName;
    } else if (currentStepName === 'account-info') {
      return formData.email && 
             formData.password && formData.password.length >= 8 && 
             formData.password === formData.confirmPassword;
    } else if (currentStepName === 'preferences') {
      return formData.agreeToTerms === true;
    }
    return true;
  };

  // Submit form
  const handleSubmit = async () => {
    try {
      console.log("Registration data:", formData);
      
      const result = await signUp.email({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        name: formData.username || [formData.firstName, formData.lastName].filter(Boolean).join(" ") || formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        nameDisplayPreference: formData.nameDisplayPreference,
        optInCommunications: formData.optInCommunications,
        subscribeToUpdates: formData.subscribeToUpdates,
      } as any);

      if (result.error) {
        console.error("Registration error:", result.error);
        
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
        // Clear draft on successful registration
        clearDraft();
        console.log("Registration successful");
        
        
        router.push("/");
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error; // Let the integration hook handle the error
    }
  };

  // Step validation
  const handleStepValidation = () => {
    // Use the integration hook's validate function
    const isValid = validate(formData);
    
    if (isValid) {
      goToNextStep();
    }
  };

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
          value={formData.firstName}
          onChange={(e) => updateField('firstName', e.target.value)}
          error={draftErrors.firstName}
          required
          placeholder="Enter your first name"
          icon={User}
        />

        <FormInput
          label="Last Name"
          value={formData.lastName}
          onChange={(e) => updateField('lastName', e.target.value)}
          error={draftErrors.lastName}
          required
          placeholder="Enter your last name"
          icon={User}
        />
      </div>

      <FormInput
        label="Username"
        value={formData.username}
        onChange={(e) => updateField('username', e.target.value)}
        error={draftErrors.username}
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
        value={formData.email}
        onChange={(e) => updateField('email', e.target.value)}
        error={draftErrors.email}
        required
        placeholder="Enter your email"
        icon={Mail}
      />

        <FormInput
          label="Password"
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={(e) => updateField('password', e.target.value)}
          error={draftErrors.password}
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
          value={formData.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          error={draftErrors.confirmPassword}
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
          value={formData.nameDisplayPreference}
          onValueChange={(value) => updateField('nameDisplayPreference', value)}
          error={draftErrors.nameDisplayPreference}
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
          checked={formData.subscribeToUpdates}
          onCheckedChange={(checked) => updateField('subscribeToUpdates', checked)}
          error={draftErrors.subscribeToUpdates}
        />

        <FormCheckbox
          label="Receive general platform updates and announcements"
          checked={formData.optInCommunications}
          onCheckedChange={(checked) => updateField('optInCommunications', checked)}
          error={draftErrors.optInCommunications}
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
          checked={formData.agreeToTerms}
          onCheckedChange={(checked) => updateField('agreeToTerms', checked)}
          error={draftErrors.agreeToTerms}
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
          currentStep={currentStep}
          totalSteps={steps.length}
          onSubmit={isLastStep ? () => submit(handleSubmit) : handleStepValidation}
          onCancel={goToPreviousStep}
          isSubmitting={isSubmitting}
          isValid={isLastStep ? !!isFormValid() : !!isCurrentStepValid()}
          isDirty={Object.values(formData).some(value => value !== '' && value !== false)}
          submitLabel={isLastStep ? "Create Account" : "Continue"}
          cancelLabel="Back"
          showCancel={!isFirstStep}
          showReset={false}
        >
          <>
            <FormStatus 
              error={draftErrors.email || draftErrors.password || draftErrors.username || draftErrors.general}
            />
            {renderCurrentStep()}
          </>
        </Modal>
      </div>
    </main>
  );
}
