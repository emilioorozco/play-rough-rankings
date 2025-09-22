"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "./session-provider";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useAsyncOperationEnhanced } from "@/hooks/stores/use-loading-store-enhanced";

interface ProfileCompletionProps {
  className?: string;
}

export function ProfileCompletion({ className }: ProfileCompletionProps) {
  const { user, refetch, signOut } = useSession();
  const router = useRouter();
  
  // Use form draft store for auto-save functionality
  const { draft, save, update } = useFormDraft('profile-completion');
  const { execute, isLoading, error } = useAsyncOperationEnhanced('profile-completion');
  
  // Initialize form data from draft or user data
  const formData = draft?.data || { 
    firstName: user?.firstName || "", 
    lastName: user?.lastName || "" 
  };
  const firstName = formData.firstName;
  const lastName = formData.lastName;
  
  // Auto-save form data
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (firstName || lastName) {
        save({ firstName, lastName }, 'profile-completion');
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [firstName, lastName, save]);

  // Update user profile mutation
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      refetch();
      router.push("/");
    },
    onError: (error) => {
      console.error("Profile update error:", error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      throw new Error("First name is required");
    }

    if (!lastName.trim()) {
      throw new Error("Last name is required");
    }

    await execute(async () => {
      // Date of birth validation removed
      console.log("Sending profile data:", { firstName, lastName });
      await updateProfile.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      // Add a 1 second delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>Please sign in to complete your profile.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Complete Your Profile</CardTitle>
        <CardDescription>
          Welcome, {user.name || user.email}! To provide the best experience and ensure privacy protection, 
          we need a few more details from you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => save({ ...formData, firstName: e.target.value }, 'profile-completion')}
                required
                className="w-full"
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => save({ ...formData, lastName: e.target.value }, 'profile-completion')}
                required
                className="w-full"
                placeholder="Enter your last name"
              />
            </div>
          </div>

          {/* Date of birth input removed */}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error instanceof Error ? error.message : String(error)}
            </div>
          )}

          {/* Draft indicator */}
          {draft && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              💾 Draft saved {draft.lastSaved ? new Date(draft.lastSaved).toLocaleTimeString() : 'just now'}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              Sign Out
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Completing..." : "Complete Profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
