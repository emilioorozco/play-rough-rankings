/**
 * Utility functions for displaying names based on user preferences
 */

export type NameDisplayPreference = "FIRST_NAME" | "FIRST_LAST_NAME" | "DISPLAY_NAME" | "OPT_OUT";

export interface UserNameData {
  name?: string | null; // @deprecated - use firstName and lastName instead
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
}

export interface NameDisplayOptions {
  preference: NameDisplayPreference;
  fallback?: string;
}

/**
 * Get the display name based on user preferences
 * @param userData - User's name and displayName data
 * @param options - Display preferences and fallback
 * @returns The formatted name string
 */
export function getDisplayName(
  userData: UserNameData,
  options: NameDisplayOptions
): string {
  const { name, firstName, lastName, displayName } = userData;
  const { preference, fallback = "User" } = options;

  // Handle null/undefined values
  if (!name && !firstName && !lastName && !displayName) {
    return fallback;
  }

  switch (preference) {
    case "FIRST_NAME": {
      // Use new firstName field if available, otherwise fall back to legacy name parsing
      if (firstName) return firstName;
      if (name) {
        const legacyFirstName = name.split(" ")[0];
        return legacyFirstName || fallback;
      }
      return fallback;
    }

    case "FIRST_LAST_NAME": {
      // Use new firstName and lastName fields if available, otherwise fall back to legacy name
      if (firstName && lastName) return `${firstName} ${lastName}`;
      if (name) return name;
      return fallback;
    }

    case "DISPLAY_NAME": {
      if (displayName) return displayName;
      // Fallback to first name if display name not available
      if (firstName) return firstName;
      if (name) {
        const legacyFirstName = name.split(" ")[0];
        return legacyFirstName || fallback;
      }
      return fallback;
    }

    case "OPT_OUT": {
      // For privacy, return a generic identifier
      return "Private User";
    }

    default:
      return fallback;
  }
}

/**
 * Get initials for avatar display based on user preferences
 * @param userData - User's name and displayName data
 * @param options - Display preferences
 * @returns The initials string (1-2 characters)
 */
export function getDisplayInitials(
  userData: UserNameData,
  options: NameDisplayOptions
): string {
  const { name, firstName, lastName, displayName } = userData;
  const { preference, fallback = "U" } = options;

  // Handle null/undefined values
  if (!name && !firstName && !lastName && !displayName) {
    return fallback;
  }

  switch (preference) {
    case "FIRST_NAME": {
      // Use new firstName field if available, otherwise fall back to legacy name parsing
      if (firstName) return firstName.charAt(0).toUpperCase() || fallback;
      if (name) {
        const legacyFirstName = name.split(" ")[0];
        return legacyFirstName.charAt(0).toUpperCase() || fallback;
      }
      return fallback;
    }

    case "FIRST_LAST_NAME": {
      // Use new firstName and lastName fields if available, otherwise fall back to legacy name
      if (firstName && lastName) {
        return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
      }
      if (name) {
        const nameParts = name.split(" ");
        if (nameParts.length >= 2) {
          return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0))
            .toUpperCase();
        }
        return nameParts[0].charAt(0).toUpperCase() || fallback;
      }
      return fallback;
    }

    case "DISPLAY_NAME": {
      if (displayName) {
        // For display names, try to get initials from words
        const words = displayName.split(" ");
        if (words.length >= 2) {
          return (words[0].charAt(0) + words[words.length - 1].charAt(0))
            .toUpperCase();
        }
        return displayName.charAt(0).toUpperCase();
      }
      // Fallback to first name if display name not available
      if (firstName) return firstName.charAt(0).toUpperCase() || fallback;
      if (name) {
        const legacyFirstName = name.split(" ")[0];
        return legacyFirstName.charAt(0).toUpperCase() || fallback;
      }
      return fallback;
    }

    case "OPT_OUT": {
      // For privacy, return generic initials
      return "P";
    }

    default:
      return fallback;
  }
}

/**
 * Get a preview of how the name will be displayed
 * @param userData - User's name and displayName data
 * @param preference - The display preference to preview
 * @returns Object with display name and initials
 */
export function getDisplayPreview(
  userData: UserNameData,
  preference: NameDisplayPreference
): { displayName: string; initials: string } {
  return {
    displayName: getDisplayName(userData, { preference }),
    initials: getDisplayInitials(userData, { preference }),
  };
}

/**
 * Get all available display options for a user
 * @param userData - User's name and displayName data
 * @returns Array of available display options with previews
 */
export function getAvailableDisplayOptions(userData: UserNameData) {
  const { name, firstName, lastName, displayName } = userData;
  const legacyFullName = name || "";
  const legacyNameParts = legacyFullName.split(" ");
  const legacyFirstName = legacyNameParts[0] || "";
  const hasLegacyLastName = legacyNameParts.length > 1;
  
  // Use new fields if available, otherwise fall back to legacy
  const effectiveFirstName = firstName || legacyFirstName;
  const effectiveLastName = lastName || (hasLegacyLastName ? legacyNameParts.slice(1).join(" ") : "");
  const effectiveFullName = effectiveFirstName && effectiveLastName ? `${effectiveFirstName} ${effectiveLastName}` : legacyFullName;

  const options = [
    {
      value: "OPT_OUT" as const,
      label: "Opt Out (Private)",
      available: true, // Always available
      preview: getDisplayPreview(userData, "OPT_OUT"),
    },
    {
      value: "FIRST_NAME" as const,
      label: "First Name Only",
      available: !!effectiveFirstName,
      preview: getDisplayPreview(userData, "FIRST_NAME"),
    },
    {
      value: "FIRST_LAST_NAME" as const,
      label: "First + Last Name",
      available: !!effectiveFullName && (!!effectiveFirstName && !!effectiveLastName),
      preview: getDisplayPreview(userData, "FIRST_LAST_NAME"),
    },
    {
      value: "DISPLAY_NAME" as const,
      label: "Display Name",
      available: !!displayName,
      preview: getDisplayPreview(userData, "DISPLAY_NAME"),
    },
  ].filter((option) => option.available);

  // If no options are available, provide a fallback
  if (options.length === 0) {
    options.push({
      value: "OPT_OUT" as const,
      label: "Opt Out (Private)",
      available: true,
      preview: getDisplayPreview(userData, "OPT_OUT"),
    });
  }

  return options;
}
