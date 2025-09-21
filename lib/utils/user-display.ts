import type { UserPreferences } from "@/lib/schemas";

/**
 * Get the display name for a user based on their preferences
 */
export function getUserDisplayName(
  user: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  },
  preferences?: UserPreferences | null
): string {
  // If no preferences, default to first name
  const namePreference = preferences?.nameDisplayPreference || "FIRST_NAME";

  // Parse the full name - prioritize firstName/lastName over name field
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : (user.name || "");
  const nameParts = fullName.split(" ");
  const legacyFirstName = nameParts[0] || "";
  const legacyLastName = nameParts.slice(1).join(" ") || "";

  switch (namePreference) {
    case "OPT_OUT":
      return "Anonymous Player";
    
    case "FIRST_LAST_NAME":
      return fullName || user.email.split("@")[0] || "User";
    
    case "DISPLAY_NAME":
      return user.name || fullName || user.email.split("@")[0] || "User";
    
    case "FIRST_NAME":
    default:
      return firstName || legacyFirstName || user.email.split("@")[0] || "User";
  }
}

/**
 * Get all available display name options for a user
 */
export function getAvailableDisplayNames(
  user: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  }
): Array<{
  value: "FIRST_NAME" | "FIRST_LAST_NAME" | "DISPLAY_NAME";
  label: string;
  displayValue: string;
  available: boolean;
}> {
  // Parse the full name - prioritize firstName/lastName over name field
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : (user.name || "");
  const nameParts = fullName.split(" ");
  const legacyFirstName = nameParts[0] || "";
  const legacyLastName = nameParts.slice(1).join(" ") || "";

  return [
    {
      value: "OPT_OUT",
      label: "Opt Out (Private)",
      displayValue: "Name will not be displayed publicly",
      available: true, // Always available
    },
    {
      value: "FIRST_NAME",
      label: "First Name Only",
      displayValue: firstName || legacyFirstName || "First Name",
      available: !!(firstName || legacyFirstName),
    },
    {
      value: "FIRST_LAST_NAME",
      label: "First + Last Name",
      displayValue: fullName || "Full Name",
      available: !!fullName,
    },
    {
      value: "DISPLAY_NAME",
      label: "Display Name",
      displayValue: user.name || "Display Name",
      available: !!user.name,
    },
  ].filter((option) => option.available);
}
