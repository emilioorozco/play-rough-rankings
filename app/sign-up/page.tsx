"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import { useFormSteps } from "@/hooks/useFormState";
import { registerSchema, type RegisterFormData } from "@/lib/validation/schemas";
import { FormInput, FormSelect, FormCheckbox, FormActions, FormStatus } from "@/components/ui/form-components";
import { Button } from "@/components/ui/button";
import { Mail, Lock, User, Eye, EyeOff, Info } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  // Initialize multi-step form state
  const formState = useFormSteps<RegisterFormData>({
    steps: ['personal-info', 'account-info', 'preferences'],
    initialData: {
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      firstName: '',
      lastName: '',
      agreeToTerms: false,
      subscribeToUpdates: false,
      nameDisplayPreference: 'DISPLAY_NAME',
      optInCommunications: false,
    },
    // Remove step-specific validation schemas to prevent data loss
    // validationSchemas: {
    //   'personal-info': registerSchema.pick({
    //     username: true,
    //     firstName: true,
    //     lastName: true,
    //   }),
    //   'account-info': registerSchema.pick({
    //     email: true,
    //     password: true,
    //     confirmPassword: true,
    //   }),
    //   'preferences': registerSchema.pick({
    //     agreeToTerms: true,
    //     nameDisplayPreference: true,
    //     optInCommunications: true,
    //   }),
    // },
    onSubmit: async (data) => {
      console.log("Registration data:", { 
        email: data.email, 
        username: data.username, 
        firstName: data.firstName, 
        lastName: data.lastName,
        allData: data,
        dataKeys: Object.keys(data),
        emailType: typeof data.email,
        emailValue: data.email,
        formStateData: formState.data
      });
      
      // Use formState.data instead of the passed data if it's empty
      const formData = Object.keys(data).length === 0 ? formState.data : data;
      
      // Validate required fields
      if (!formData.email) {
        console.error("Email is missing from form data:", { data, formStateData: formState.data });
        throw new Error("Email is required");
      }
      if (!formData.password) {
        console.error("Password is missing from form data:", { data, formStateData: formState.data });
        throw new Error("Password is required");
      }
      
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
        // Redirect to dashboard on successful registration
        router.push("/");
      }
    },
    onSuccess: () => {
      console.log("Registration successful");
    },
    onError: (error) => {
      console.error("Registration error:", error);
    },
    showLoadingBar: true,
  });

  // Check if all required fields are filled for the current step
  const isCurrentStepValid = () => {
    const currentStepName = formState.currentStepName;
    const data = formState.data;
    
    if (currentStepName === 'personal-info') {
      return data.username && data.username.length >= 3 && 
             data.firstName && data.lastName;
    } else if (currentStepName === 'account-info') {
      return data.email && 
             data.password && data.password.length >= 8 && 
             data.password === data.confirmPassword;
    } else if (currentStepName === 'preferences') {
      return data.agreeToTerms === true;
    }
    
    return true;
  };

  // Check if all required fields are filled for the entire form
  const isFormValid = () => {
    const data = formState.data;
    
    return data.username && data.username.length >= 3 &&
           data.firstName && data.lastName &&
           data.email &&
           data.password && data.password.length >= 8 &&
           data.password === data.confirmPassword &&
           data.agreeToTerms === true;
  };

  // Manual step validation since we removed step-specific schemas
  const handleStepValidation = () => {
    const currentStepName = formState.currentStepName;
    const data = formState.data;
    
    // Validate current step fields
    if (currentStepName === 'personal-info') {
      if (!data.username || data.username.length < 3) {
        formState.setFieldError('username', 'Username must be at least 3 characters');
        return;
      }
      if (!data.firstName) {
        formState.setFieldError('firstName', 'First name is required');
        return;
      }
      if (!data.lastName) {
        formState.setFieldError('lastName', 'Last name is required');
        return;
      }
    } else if (currentStepName === 'account-info') {
      if (!data.email) {
        formState.setFieldError('email', 'Email is required');
        return;
      }
      if (!data.password || data.password.length < 8) {
        formState.setFieldError('password', 'Password must be at least 8 characters');
        return;
      }
      if (data.password !== data.confirmPassword) {
        formState.setFieldError('confirmPassword', 'Passwords do not match');
        return;
      }
    } else if (currentStepName === 'preferences') {
      if (!data.agreeToTerms) {
        formState.setFieldError('agreeToTerms', 'You must agree to the terms and conditions');
        return;
      }
    }
    
    // Clear any errors and proceed to next step
    formState.clearErrors();
    formState.goToNextStep();
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
    switch (formState.currentStepName) {
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

  return (
    <main className="bg-background text-foreground min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-muted-foreground">Join the community and start competing</p>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <FormStatus 
            error={formState.submissionError}
          />

          {renderCurrentStep()}

          <FormActions
            onSubmit={formState.isLastStep ? formState.submit : handleStepValidation}
            onCancel={formState.goToPreviousStep}
            isSubmitting={formState.isSubmitting}
            isValid={formState.isLastStep ? isFormValid() : isCurrentStepValid()}
            isDirty={formState.isDirty}
            submitLabel={
              formState.isLastStep ? "Create Account" : "Continue"
            }
            cancelLabel="Back"
            showReset={false}
            showCancel={!formState.isFirstStep}
          />

        </form>
      </div>
    </main>
  );
}
