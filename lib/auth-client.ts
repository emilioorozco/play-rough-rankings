import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

// Export the standard methods that are always available
export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient;