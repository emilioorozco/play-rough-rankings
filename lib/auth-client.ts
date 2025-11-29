import { createAuthClient } from "better-auth/react";

/**
 * Get the base URL for API calls.
 * On the client side, use the current origin (works for mobile testing with IP addresses).
 * On the server side or during build, use the environment variable.
 */
function getBaseURL(): string {
  // Client-side: use current origin (works with IP addresses for mobile testing)
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server-side or build-time: use environment variable
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

// Export the standard methods that are always available
export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient;