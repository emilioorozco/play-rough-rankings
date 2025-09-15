"use client";

import { useState } from "react";
import { useSession } from "./session-provider";

interface ProfileFormProps {
  onSave?: () => void;
}

export function ProfileForm({ onSave }: ProfileFormProps) {
  const { user, updateSession } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileVisibility, setProfileVisibility] = useState<
    "PUBLIC" | "PRIVATE"
  >("PUBLIC");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Implement profile update API call
      // This would typically call a tRPC mutation to update the user profile

      // For now, simulate the API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess("Profile updated successfully!");
      await updateSession();
      onSave?.();
    } catch (error: unknown) {
      setError((error as Error).message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center">
        <p>Please sign in to manage your profile.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <header className="mb-3">
        <h2>Profile Settings</h2>
        <p>Manage your account information and privacy settings</p>
      </header>

      {error && (
        <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 mb-4 bg-accent/10 border border-accent/20 rounded-lg text-accent-foreground">
          {success}
        </div>
      )}

      <div className="grid">
        <label>
          Display Name
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
            disabled={isLoading}
          />
          <small>
            This name will be shown on leaderboards and tournament results
          </small>
        </label>

        <label>
          Email Address
          <input type="email" value={email} disabled style={{ opacity: 0.6 }} />
          <small>
            Email cannot be changed here. Contact support if needed.
          </small>
        </label>
      </div>

      <label>
        Profile Visibility
        <select
          value={profileVisibility}
          onChange={(e) =>
            setProfileVisibility(e.target.value as "PUBLIC" | "PRIVATE")
          }
          disabled={isLoading}
        >
          <option value="PUBLIC">
            Public - Anyone can view your statistics
          </option>
          <option value="PRIVATE">
            Private - Only you can view your statistics
          </option>
        </select>
        <small>
          {profileVisibility === "PUBLIC"
            ? "Your tournament results and statistics will be visible to other players"
            : "Your statistics will be hidden from other players, but tournament results may still be public"}
        </small>
      </label>

      <div className="p-4 mb-4 bg-secondary/10 border border-secondary/20 rounded-lg">
        <h4>Account Information</h4>
        <p>
          <strong>Role:</strong> {user.role}
        </p>
        <p>
          <strong>Member since:</strong>{" "}
          {user.createdAt
            ? new Date(user.createdAt).toLocaleDateString()
            : "Unknown"}
        </p>
        {user.role !== "player" && (
          <small>
            {user.role === "organizer" &&
              "You have organizer privileges to create and manage tournaments."}
            {user.role === "admin" &&
              "You have administrator privileges with full system access."}
          </small>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </button>

        <button
          type="button"
          className="outline"
          onClick={() => {
            setDisplayName(user?.name || "");
            setEmail(user?.email || "");
            setProfileVisibility("PUBLIC");
            setError(null);
            setSuccess(null);
          }}
          disabled={isLoading}
        >
          Reset
        </button>
      </div>
    </form>
  );
}
