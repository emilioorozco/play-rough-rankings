import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  basePrisma: PrismaClient | undefined
}

// Create base Prisma client for functions that need the original type
const basePrisma = new PrismaClient()

// Create extended Prisma client for auto-creating related records
const extendedPrisma = basePrisma.$extends({
  query: {
    user: {
      async create({ args, query }) {
        const result = await query(args)
        
        // Auto-create Player and UserPreferences records after User creation
        if (result.id) {
          try {
            const player = await basePrisma.player.create({
              data: {
                userId: result.id,
              },
            })
            console.log(`Auto-created Player record for new user ${result.id}`, player.id)
          } catch (error) {
            // If player already exists (race condition), that's fine
            if (error instanceof Error && error.message.includes('Unique constraint')) {
              console.log(`Player record already exists for user ${result.id} (race condition)`)
            } else {
              console.error(`Error auto-creating Player record for user ${result.id}:`, error)
            }
          }
          
          try {
            const prefs = await basePrisma.userPreferences.create({
              data: {
                id: result.id, // Use user ID as the preferences ID for 1:1 relationship
                userId: result.id,
                nameDisplayPreference: 'DISPLAY_NAME',
                optInCommunications: false,
                subscribeToUpdates: false,
              },
            })
            console.log(`Auto-created UserPreferences record for new user ${result.id}`, prefs.id)
          } catch (error) {
            // If preferences already exists (race condition), that's fine
            if (error instanceof Error && error.message.includes('Unique constraint')) {
              console.log(`UserPreferences record already exists for user ${result.id} (race condition)`)
            } else {
              console.error(`Error auto-creating UserPreferences record for user ${result.id}:`, error)
            }
          }
        }
        
        return result
      },
    },
  },
})

// Export both clients
export const prisma = extendedPrisma
export const basePrismaClient = basePrisma

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma as any
  globalForPrisma.basePrisma = basePrisma
}