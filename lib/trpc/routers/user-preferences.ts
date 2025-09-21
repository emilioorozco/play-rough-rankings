import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../router-factory";
import {
  UserPreferencesSchema,
  CreateUserPreferencesSchema,
  UpdateUserPreferencesSchema,
} from "@/lib/schemas";

export const userPreferencesRouter = router({
  // Get current user's preferences
  get: protectedProcedure.query(async ({ ctx }) => {

    // Get or create user preferences
    let preferences = await ctx.prisma.userPreferences.findUnique({
      where: { userId: ctx.user.id },
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await ctx.prisma.userPreferences.create({
        data: {
          id: ctx.user.id,
          userId: ctx.user.id,
          nameDisplayPreference: "FIRST_NAME",
          profileVisibility: "PUBLIC",
          optInCommunications: false,
          optInTournamentUpdates: true,
          optInLeaderboardUpdates: true,
          optInMarketing: false,
        },
      });
    }

    return preferences;
  }),

  // Update user preferences
  update: protectedProcedure
    .input(UpdateUserPreferencesSchema)
    .mutation(async ({ ctx, input }) => {

      // Validate name display preference based on user data
      if (input.nameDisplayPreference) {
        // Get user and player data for validation
        const user = await ctx.prisma.user.findUnique({
          where: { id: ctx.user.id },
          select: {
            name: true,
          },
        });

        // Note: displayName is now handled through User.name fields

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Note: Users under 18 can choose any name display preference
        // The default is set to OPT_OUT for privacy protection, but they can override it

        // Check if user is trying to set DISPLAY_NAME but doesn't have a name
        if (input.nameDisplayPreference === "DISPLAY_NAME" && !user.name) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot set display name preference without having a name set",
          });
        }

        // Check if user is trying to set FIRST_LAST_NAME but doesn't have a full name
        if (input.nameDisplayPreference === "FIRST_LAST_NAME" && !user.name) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot set full name preference without having a name set",
          });
        }
      }

      // Check if preferences exist
      const existingPreferences = await ctx.prisma.userPreferences.findUnique({
        where: { userId: ctx.user.id },
      });

      let preferences;
      if (existingPreferences) {
        // Update existing preferences
        preferences = await ctx.prisma.userPreferences.update({
          where: { userId: ctx.user.id },
          data: input,
        });
      } else {
        // Create new preferences with provided data and defaults
        preferences = await ctx.prisma.userPreferences.create({
          data: {
            id: ctx.user.id,
            userId: ctx.user.id,
            nameDisplayPreference: input.nameDisplayPreference || "FIRST_NAME",
            profileVisibility: input.profileVisibility || "PUBLIC",
            optInCommunications: input.optInCommunications ?? false,
            optInTournamentUpdates: input.optInTournamentUpdates ?? true,
            optInLeaderboardUpdates: input.optInLeaderboardUpdates ?? true,
            optInMarketing: input.optInMarketing ?? false,
          },
        });
      }

      return {
        success: true,
        message: "Preferences updated successfully",
        preferences,
      };
    }),

  // Reset preferences to defaults
  reset: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const preferences = await ctx.prisma.userPreferences.upsert({
      where: { userId: ctx.user.id },
      update: {
        nameDisplayPreference: "FIRST_NAME",
        profileVisibility: "PUBLIC",
        optInCommunications: false,
        optInTournamentUpdates: true,
        optInLeaderboardUpdates: true,
        optInMarketing: false,
      },
      create: {
        id: ctx.user.id,
        userId: ctx.user.id,
        nameDisplayPreference: "FIRST_NAME",
        profileVisibility: "PUBLIC",
        optInCommunications: false,
        optInTournamentUpdates: true,
        optInLeaderboardUpdates: true,
        optInMarketing: false,
      },
    });

    return {
      success: true,
      message: "Preferences reset to defaults",
      preferences,
    };
  }),

  // Get name display options for the current user
  getNameDisplayOptions: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    // Get user data to determine available name options
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        name: true, // @deprecated - keeping for backward compatibility
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Note: displayName is now handled through User.name fields

    // Parse name if available (support both old and new format)
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : (user.name || "");
    const nameParts = fullName.split(" ");
    const legacyFirstName = nameParts[0] || "";
    const legacyLastName = nameParts.slice(1).join(" ") || "";

    // Build available options
    const options = [
      {
        value: "OPT_OUT" as const,
        label: "Opt Out (Private)",
        displayValue: "Name will not be displayed publicly",
        available: true, // Always available
        isDefault: false,
      },
      {
        value: "FIRST_NAME" as const,
        label: "First Name Only",
        displayValue: firstName || legacyFirstName || "First Name (not set)",
        available: true, // Always available
        isDefault: !!(firstName || legacyFirstName),
      },
      {
        value: "FIRST_LAST_NAME" as const,
        label: "First + Last Name",
        displayValue: fullName || "Full Name (not set)",
        available: true, // Always available
        isDefault: false,
      },
      {
        value: "DISPLAY_NAME" as const,
        label: "Display Name",
        displayValue: user.name || "Display Name (not set)",
        available: true, // Always available
        isDefault: false,
      },
    ];

    return {
      options,
      currentUser: {
        name: user.name, // @deprecated - keeping for backward compatibility
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        displayName: user.name, // Now using User.name instead of Player.displayName
      },
    };
  }),
});
