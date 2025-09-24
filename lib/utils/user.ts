export const userPublicSelectMinimal = {
  name: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

export const userPublicSelectWithPrefs = {
  ...userPublicSelectMinimal,
  userPreferences: {
    select: {
      profileVisibility: true,
    },
  },
} as const;

type UserNameFields = { [key: string]: unknown };

export function getDisplayName(user: unknown): string {
  if (!user) return "Unknown Player";
  const u = user as { firstName?: string | null; name?: string | null };
  return u.firstName || u.name || "Unknown Player";
}

export function getPublicDisplayName(user: unknown): string {
  if (!user) return "Unknown Player";
  const u = user as { userPreferences?: { profileVisibility?: string | null } | null };
  const isPublic = u.userPreferences?.profileVisibility === "PUBLIC";
  return isPublic ? getDisplayName(user) : "Private Player";
}


