import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["profile", "email", "openid"], // Request additional profile information
      profile: (profile: any) => {
        console.log("[Google] profile received (keys):", Object.keys(profile));
        try {
          console.dir(profile, { depth: null });
        } catch {}
        
        // Google provides given_name and family_name directly
        const firstName = profile.given_name || "";
        const lastName = profile.family_name || "";
        
        console.log(`[Google] parsed names => firstName="${firstName}", lastName="${lastName}"`);
        
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          firstName: firstName,
          lastName: lastName,
          image: profile.picture,
        };
      },
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      scope: ["identify", "email"], // Request user identification and email
      profile: (profile: any) => {
        console.log("Discord profile received:", profile);
        
        // Discord doesn't provide separate first/last names, only username and global_name
        const displayName = profile.global_name || profile.username || "";
        
        // For Discord, we'll use the display name as firstName and leave lastName empty
        // Users can update their profile later if they want to provide separate names
        const firstName = displayName;
        const lastName = "";
        
        console.log(`Discord profile: displayName="${displayName}", firstName="${firstName}", lastName="${lastName}"`);
        
        return {
          id: profile.id,
          email: profile.email,
          name: displayName,
          firstName: firstName,
          lastName: lastName,
          image: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null,
        };
      },
    },
    // apple: {
    //   clientId: process.env.APPLE_CLIENT_ID!,
    //   clientSecret: process.env.APPLE_CLIENT_SECRET!,
    // },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "player",
        input: false, // Don't allow users to set this directly
      },
      // dateOfBirth removed from auth additionalFields; field remains in DB model
      firstName: {
        type: "string",
        required: false,
        input: true, // Allow users to set this during registration
      },
      lastName: {
        type: "string",
        required: false,
        input: true, // Allow users to set this during registration
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  callbacks: {
    async beforeSignUp({ user, account }: { user: any; account: any }) {
      console.log("beforeSignUp callback triggered for user:", user.id, "account:", account?.providerId);
      
      // For OAuth providers: Parse name to extract firstName and lastName during sign-up
      if (account && user.name && (!user.firstName && !user.lastName)) {
        const nameParts = user.name.trim().split(/\s+/);
        let firstName = "";
        let lastName = "";
        
        if (nameParts.length === 1) {
          firstName = nameParts[0];
          lastName = "";
        } else if (nameParts.length === 2) {
          firstName = nameParts[0];
          lastName = nameParts[1];
        } else {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(" ");
        }
        
        user.firstName = firstName;
        user.lastName = lastName;
        console.log(`Setting user firstName: "${firstName}", lastName: "${lastName}" during OAuth sign-up`);
      }
      
      // For email registration: firstName and lastName should be passed in the user object
      if (!account && (user.firstName || user.lastName)) {
        console.log(`Email registration with firstName: "${user.firstName}", lastName: "${user.lastName}"`);
      }
      
      return user;
    },
    async afterSignUp({ user, account }: { user: any; account: any }) {
      console.log("afterSignUp callback triggered for user:", user.id, "account:", account?.providerId);
      
      // Create Player record for new user
      try {
        await prisma.player.create({
          data: {
            userId: user.id,
          },
        });
        console.log(`Created Player record for new user ${user.id}`);
      } catch (error) {
        console.error("Error creating Player record for new user:", error);
      }
      
      // Create UserPreferences record for new user
      try {
        await prisma.userPreferences.create({
          data: {
            id: user.id, // Use user ID as the preferences ID for 1:1 relationship
            userId: user.id,
            nameDisplayPreference: user.nameDisplayPreference || 'DISPLAY_NAME',
            optInCommunications: user.optInCommunications || false,
            subscribeToUpdates: user.subscribeToUpdates || false,
          },
        });
        console.log(`Created UserPreferences record for new user ${user.id}`);
      } catch (error) {
        console.error("Error creating UserPreferences record for new user:", error);
      }
      
      return user;
    },
    async afterSignIn({ user, account }: { user: any; account: any }) {
      console.log("afterSignIn callback triggered for user:", user.id, "account:", account?.providerId);
      
      // Parse name from OAuth providers to extract firstName and lastName
      // Only do this if the provider didn't already set firstName/lastName (like Google does)
      if (account && user.name && (!user.firstName && !user.lastName)) {
        const nameParts = user.name.trim().split(/\s+/);
        let firstName = "";
        let lastName = "";
        
        if (nameParts.length === 1) {
          // Only one name part - treat as first name
          firstName = nameParts[0];
          lastName = "";
        } else if (nameParts.length === 2) {
          // Two name parts - first and last name
          firstName = nameParts[0];
          lastName = nameParts[1];
        } else {
          // More than two parts - first name is first part, rest is last name
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(" ");
        }
        
        // Update the user in the database
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              firstName: firstName,
              lastName: lastName,
            },
          });
          
          console.log(`Updated user ${user.id} with firstName: "${firstName}", lastName: "${lastName}"`);
        } catch (error) {
          console.error("Error updating user firstName/lastName:", error);
        }
      } else if (account && user.firstName && user.lastName) {
        console.log(`User ${user.id} already has firstName: "${user.firstName}", lastName: "${user.lastName}" from OAuth provider`);
      }
      
      // Ensure Player record exists for this user
      try {
        await prisma.player.upsert({
          where: { userId: user.id },
          update: {}, // No updates needed if player already exists
          create: {
            userId: user.id,
          },
        });
        console.log(`Ensured Player record exists for user ${user.id}`);
      } catch (error) {
        console.error("Error ensuring Player record exists:", error);
      }
      
    },
    async onSuccess({ user, account }: { user: any; account: any }) {
      console.log("onSuccess callback triggered for user:", user.id, "account:", account?.providerId);
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;