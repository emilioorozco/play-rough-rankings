"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  User,
  Lock,
  MapPin,
  Gamepad2,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "./session-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface LoginCardProps {
  className?: string;
}

interface FloatingLabelInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  className?: string;
}

function FloatingLabelInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  icon: Icon,
  showPasswordToggle = false,
  showPassword = false,
  onTogglePassword,
  className,
}: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative space-y-2">
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        )}
        <Input
          id={id}
          type={
            showPasswordToggle ? (showPassword ? "text" : "password") : type
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            Icon ? "pl-10" : "pl-3",
            showPasswordToggle ? "pr-10" : "pr-3",
            "py-3 transition-all duration-200",
            error
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : "",
            className,
          )}
        />
        <Label
          htmlFor={id}
          className={cn(
            "absolute pointer-events-none",
            Icon ? "left-10" : "left-3",
            value || isFocused
              ? "opacity-0 top-2 text-xs text-muted-foreground"
              : "opacity-100 top-1/2 -translate-y-1/2 text-muted-foreground",
          )}
        >
          {label}
        </Label>
        {showPasswordToggle && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={onTogglePassword}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1 animate-in slide-in-from-left-1">
          {error}
        </p>
      )}
    </div>
  );
}

export function LoginCard({ className }: LoginCardProps) {
  const { signIn } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    firstName: "",
    lastName: "",
    location: "",
    favoriteGame: "",
    agreeToTerms: false,
    subscribeToUpdates: false,
    rememberMe: false,
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (mode === "register") {
      if (step === 1) {
        if (!formData.username) {
          newErrors.username = "Username is required";
        } else if (formData.username.length < 3) {
          newErrors.username = "Username must be at least 3 characters";
        }

        if (!formData.firstName) {
          newErrors.firstName = "First name is required";
        }

        if (!formData.lastName) {
          newErrors.lastName = "Last name is required";
        }
      }

      if (step === 2) {
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = "Please confirm your password";
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        }

        if (!formData.agreeToTerms) {
          newErrors.agreeToTerms = "You must agree to the terms and conditions";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (mode === "register" && step === 1) {
      setStep(2);
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (mode === "register") {
        // Handle registration - for now just redirect to dashboard
        router.push("/dashboard");
      } else {
        // Handle login
        const result = await signIn.email({
          email: formData.email,
          password: formData.password,
        });

        if (result.error) {
          setErrors({
            general: result.error.message || "Authentication failed",
          });
        } else {
          router.push("/dashboard");
        }
      }
    } catch (error: unknown) {
      setErrors({
        general: (error as Error).message || "Authentication failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (
    provider: "google" | "discord" | "apple",
  ) => {
    setIsLoading(true);

    try {
      await signIn.social({
        provider,
        callbackURL: "/dashboard",
      });
    } catch (error: unknown) {
      setErrors({ general: (error as Error).message || "Social login failed" });
      setIsLoading(false);
    }
  };

  // Registration Step 1
  if (mode === "register" && step === 1) {
    return (
      <Card className={cn("w-full max-w-md bg-card shadow-lg", className)}>
        <CardHeader className="space-y-3 text-center pt-4 pb-6 px-6">
          <CardTitle>Create Account</CardTitle>
          <p className="text-sm text-muted-foreground">
            Join the fighting game community
          </p>
          <div className="flex justify-center gap-1">
            <div className="w-8 h-1 bg-primary rounded-full" />
            <div className="w-8 h-1 bg-muted rounded-full" />
          </div>
          <Badge variant="outline" className="mx-auto">
            Step 1 of 2
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          {errors.general && (
            <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FloatingLabelInput
                id="firstName"
                label="First Name"
                value={formData.firstName}
                onChange={(value) => handleInputChange("firstName", value)}
                error={errors.firstName}
                icon={User}
              />
              <FloatingLabelInput
                id="lastName"
                label="Last Name"
                value={formData.lastName}
                onChange={(value) => handleInputChange("lastName", value)}
                error={errors.lastName}
                icon={User}
              />
            </div>

            <FloatingLabelInput
              id="username"
              label="Username"
              value={formData.username}
              onChange={(value) => handleInputChange("username", value)}
              error={errors.username}
              icon={User}
            />

            <FloatingLabelInput
              id="email"
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(value) => handleInputChange("email", value)}
              error={errors.email}
              icon={Mail}
            />

            <Button
              type="submit"
              className="w-full transition-colors duration-200"
              disabled={isLoading}
            >
              Continue
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-primary hover:text-primary/80"
                onClick={() => setMode("login")}
              >
                Sign in
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Registration Step 2
  if (mode === "register" && step === 2) {
    return (
      <Card className={cn("w-full max-w-md bg-card shadow-lg", className)}>
        <CardHeader className="space-y-3 text-center pt-4 pb-6 px-6">
          <CardTitle>Complete Your Profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            Almost there! Just a few more details
          </p>
          <div className="flex justify-center gap-1">
            <div className="w-8 h-1 bg-primary rounded-full" />
            <div className="w-8 h-1 bg-primary rounded-full" />
          </div>
          <Badge variant="outline" className="mx-auto">
            Step 2 of 2
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          {errors.general && (
            <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FloatingLabelInput
              id="password"
              label="Password"
              value={formData.password}
              onChange={(value) => handleInputChange("password", value)}
              error={errors.password}
              icon={Lock}
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
            />

            <FloatingLabelInput
              id="confirmPassword"
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={(value) => handleInputChange("confirmPassword", value)}
              error={errors.confirmPassword}
              icon={Lock}
              showPasswordToggle
              showPassword={showConfirmPassword}
              onTogglePassword={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
            />

            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">
                Location (Optional)
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  className="pl-10"
                  placeholder="e.g., New York, NY"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="favoriteGame" className="text-sm font-medium">
                Favorite Fighting Game (Optional)
              </Label>
              <Select
                value={formData.favoriteGame}
                onValueChange={(value) =>
                  handleInputChange("favoriteGame", value)
                }
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select your main game" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="street-fighter-6">
                    Street Fighter 6
                  </SelectItem>
                  <SelectItem value="tekken-8">Tekken 8</SelectItem>
                  <SelectItem value="mortal-kombat-1">
                    Mortal Kombat 1
                  </SelectItem>
                  <SelectItem value="guilty-gear-strive">
                    Guilty Gear Strive
                  </SelectItem>
                  <SelectItem value="king-of-fighters-xv">
                    King of Fighters XV
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) =>
                    handleInputChange("agreeToTerms", checked as boolean)
                  }
                  className={errors.agreeToTerms ? "border-destructive" : ""}
                />
                <Label
                  htmlFor="agreeToTerms"
                  className="text-sm leading-relaxed"
                >
                  I agree to the{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary hover:text-primary/80"
                  >
                    Terms of Service
                  </Button>{" "}
                  and{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary hover:text-primary/80"
                  >
                    Privacy Policy
                  </Button>
                </Label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-sm text-destructive">
                  {errors.agreeToTerms}
                </p>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="subscribeToUpdates"
                  checked={formData.subscribeToUpdates}
                  onCheckedChange={(checked) =>
                    handleInputChange("subscribeToUpdates", checked as boolean)
                  }
                />
                <Label
                  htmlFor="subscribeToUpdates"
                  className="text-sm leading-relaxed"
                >
                  Send me tournament updates and community news
                </Label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Creating Account...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Create Account
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Login Form
  return (
    <Card className={cn("w-full max-w-md bg-card shadow-lg", className)}>
      <CardHeader className="space-y-3 text-center pt-4 pb-6 px-6">
        <CardTitle>Welcome Back</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sign in to your tournament account
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {errors.general && (
          <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FloatingLabelInput
            id="email"
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(value) => handleInputChange("email", value)}
            error={errors.email}
            icon={Mail}
          />

          <FloatingLabelInput
            id="password"
            label="Password"
            value={formData.password}
            onChange={(value) => handleInputChange("password", value)}
            error={errors.password}
            icon={Lock}
            showPasswordToggle
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={formData.rememberMe}
                onCheckedChange={(checked) =>
                  handleInputChange("rememberMe", checked as boolean)
                }
              />
              <Label htmlFor="remember" className="text-sm">
                Remember me
              </Label>
            </div>
            <Button
              variant="link"
              className="p-0 h-auto text-primary hover:text-primary/80"
            >
              Forgot password?
            </Button>
          </div>

          <Button
            type="submit"
            className="w-full transition-colors duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Signing In...
              </div>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full flex items-center gap-2 text-foreground hover:text-foreground font-medium"
            onClick={() => handleSocialLogin("google")}
            disabled={isLoading}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full flex items-center gap-2 text-foreground hover:text-foreground font-medium"
            onClick={() => handleSocialLogin("discord")}
            disabled={isLoading}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.010c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Continue with Discord
          </Button>
          <Button
            variant="outline"
            className="w-full flex items-center gap-2 text-foreground hover:text-foreground font-medium"
            onClick={() => handleSocialLogin("apple")}
            disabled={isLoading}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            Continue with Apple
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-primary hover:text-primary/80"
              onClick={() => setMode("register")}
            >
              Sign up
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
