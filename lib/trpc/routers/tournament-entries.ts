import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, organizerProcedure } from '../router-factory'
import { getDisplayName, getPublicDisplayName, userPublicSelectMinimal, userPublicSelectWithPrefs } from '@/lib/utils/user'
import { CreateTournamentEntrySchema, UpdateTournamentEntrySchema } from '@/lib/schemas'

export const tournamentEntriesRouter = router({
  // Get tournament entries for a tournament
  getByTournament: publicProcedure
    .input(z.object({
      tournamentId: z.string().uuid(),
      includeDeckInfo: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      // Verify tournament exists
      const tournament = await ctx.prisma.tournament.findUnique({
        where: { id: input.tournamentId },
        include: { game: true },
      })

      if (!tournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found'
        })
      }

      const entries = await ctx.prisma.tournamentEntry.findMany({
        where: { tournamentId: input.tournamentId },
        include: {
          player: {
            select: {
              id: true,
              user: { select: userPublicSelectWithPrefs },
            },
          },
          deck: input.includeDeckInfo ? {
            select: {
              id: true,
              name: true,
              archetype: true,
              format: true,
            },
          } : false,
        },
        orderBy: [
          { placement: 'asc' },
          { player: { user: { name: 'asc' } } },
        ],
      })

      // Filter out private player information and handle deck list privacy
      const filteredEntries = entries.map(entry => {
        const isPublicProfile = entry.player.user?.userPreferences?.profileVisibility === 'PUBLIC'
        const entryMetadata = entry.metadata as { deckList?: string; shareDeckList?: boolean } | null
        const shareDeckList = entryMetadata?.shareDeckList ?? false
        
        return {
          ...entry,
          player: {
            id: entry.player.id,
            displayName: getPublicDisplayName(entry.player.user),
            isPublic: isPublicProfile,
          },
          deck: entry.deck && isPublicProfile ? entry.deck : null,
          // Only expose deck list if profile is public AND shareDeckList is true
          metadata: isPublicProfile && shareDeckList && entryMetadata
            ? { deckList: entryMetadata.deckList, shareDeckList: entryMetadata.shareDeckList }
            : null,
        }
      })

      return {
        tournament,
        entries: filteredEntries,
        totalEntries: entries.length,
      }
    }),

  // Get entries for a specific player
  getByPlayer: publicProcedure
    .input(z.object({
      playerId: z.string().uuid(),
      gameId: z.string().uuid().optional(),
      includeDeckInfo: z.boolean().default(true),
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Verify player exists and check privacy
      const player = await ctx.prisma.player.findUnique({
        where: { id: input.playerId },
        include: {
          user: { select: userPublicSelectWithPrefs },
        },
      })

      if (!player) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Player not found'
        })
      }

      if (player.user.userPreferences?.profileVisibility !== 'PUBLIC') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This player profile is private'
        })
      }

      // Build where clause
      const where: Record<string, unknown> = {
        playerId: input.playerId,
      }

      if (input.gameId) {
        where.tournament = {
          gameId: input.gameId,
        }
      }

      const entries = await ctx.prisma.tournamentEntry.findMany({
        where,
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              date: true,
              format: true,
              status: true,
              game: {
                select: {
                  name: true,
                  shortName: true,
                },
              },
            },
          },
          deck: input.includeDeckInfo ? {
            select: {
              id: true,
              name: true,
              archetype: true,
              format: true,
            },
          } : false,
        },
        orderBy: {
          tournament: { date: 'desc' },
        },
        take: input.limit,
      })

      // Filter deck lists based on privacy settings
      const filteredEntries = entries.map(entry => {
        const entryMetadata = entry.metadata as { deckList?: string; shareDeckList?: boolean } | null
        const shareDeckList = entryMetadata?.shareDeckList ?? false
        
        return {
          ...entry,
          // Only expose deck list if shareDeckList is true
          metadata: shareDeckList && entryMetadata
            ? { deckList: entryMetadata.deckList, shareDeckList: entryMetadata.shareDeckList }
            : null,
        }
      })

      return {
        player: {
          id: player.id,
          displayName: getDisplayName(player.user),
        },
        entries: filteredEntries,
        totalEntries: filteredEntries.length,
      }
    }),

  // Create tournament entry (organizers and admins)
  create: organizerProcedure
    .input(CreateTournamentEntrySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify tournament exists
      const tournament = await ctx.prisma.tournament.findUnique({
        where: { id: input.tournamentId },
      })

      if (!tournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found'
        })
      }

      // Verify player exists, create user if player exists but user doesn't
      const player = await ctx.prisma.player.findUnique({
        where: { id: input.playerId },
        include: {
          user: true,
        },
      })

      if (!player) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Player not found'
        })
      }

      // Defensive user creation: If player exists but user doesn't, create a basic user
      if (!player.user) {
        try {
          // Create a minimal user record for the existing player
          await ctx.prisma.user.create({
            data: {
              id: player.userId,
              email: `player-${player.id}@placeholder.com`, // Placeholder email
              name: `Player ${player.id.slice(0, 8)}`, // Placeholder name
              role: 'player',
            },
          })
        } catch (error) {
          console.error('Error creating User record for existing player:', error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Player data is corrupted. Please contact support.'
          })
        }
      }

      // Verify deck exists and matches tournament game/format if provided
      if (input.deckId) {
        const deck = await ctx.prisma.deck.findUnique({
          where: { id: input.deckId },
        })

        if (!deck) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Deck not found'
          })
        }

        if (deck.gameId !== tournament.gameId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Deck game does not match tournament game'
          })
        }

        if (deck.format !== tournament.format) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Deck format does not match tournament format'
          })
        }
      }

      // Check for existing entry
      const existingEntry = await ctx.prisma.tournamentEntry.findUnique({
        where: {
          tournamentId_playerId: {
            tournamentId: input.tournamentId,
            playerId: input.playerId,
          },
        },
      })

      if (existingEntry) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Player is already entered in this tournament'
        })
      }

      const entry = await ctx.prisma.tournamentEntry.create({
        data: input,
        include: {
          tournament: {
            select: {
              name: true,
              date: true,
              format: true,
            },
          },
          player: {
            select: {
              user: { select: userPublicSelectMinimal },
            },
          },
          deck: {
            select: {
              name: true,
              archetype: true,
            },
          },
        },
      })

      return entry
    }),

  // Update tournament entry (organizers and admins)
  update: organizerProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: UpdateTournamentEntrySchema,
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify entry exists
      const existingEntry = await ctx.prisma.tournamentEntry.findUnique({
        where: { id: input.id },
        include: {
          tournament: true,
        },
      })

      if (!existingEntry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament entry not found'
        })
      }

      // Verify deck if being updated
      if (input.data.deckId) {
        const deck = await ctx.prisma.deck.findUnique({
          where: { id: input.data.deckId },
        })

        if (!deck) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Deck not found'
          })
        }

        if (deck.gameId !== existingEntry.tournament.gameId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Deck game does not match tournament game'
          })
        }

        if (deck.format !== existingEntry.tournament.format) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Deck format does not match tournament format'
          })
        }
      }

      const updatedEntry = await ctx.prisma.tournamentEntry.update({
        where: { id: input.id },
        data: input.data,
        include: {
          tournament: {
            select: {
              name: true,
              date: true,
              format: true,
            },
          },
          player: {
            select: {
              user: { select: userPublicSelectMinimal },
            },
          },
          deck: {
            select: {
              name: true,
              archetype: true,
            },
          },
        },
      })

      return updatedEntry
    }),

  // Delete tournament entry (organizers and admins)
  delete: organizerProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify entry exists
      const existingEntry = await ctx.prisma.tournamentEntry.findUnique({
        where: { id: input.id },
      })

      if (!existingEntry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament entry not found'
        })
      }

      await ctx.prisma.tournamentEntry.delete({
        where: { id: input.id },
      })

      return {
        success: true,
        message: 'Tournament entry deleted successfully',
      }
    }),

  // Bulk create tournament entries
  bulkCreate: organizerProcedure
    .input(z.object({
      tournamentId: z.string().uuid(),
      entries: z.array(z.object({
        playerId: z.string().uuid(),
        deckId: z.string().uuid().optional(),
        placement: z.number().int().min(1).optional(),
        record: z.object({
          wins: z.number().int().min(0).default(0),
          losses: z.number().int().min(0).default(0),
          draws: z.number().int().min(0).default(0),
        }).optional(),
      })).min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify tournament exists
      const tournament = await ctx.prisma.tournament.findUnique({
        where: { id: input.tournamentId },
      })

      if (!tournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found'
        })
      }

      // Verify all players exist, create users for any missing ones
      const playerIds = input.entries.map(e => e.playerId)
      const players = await ctx.prisma.player.findMany({
        where: { id: { in: playerIds } },
        include: {
          user: true,
        },
      })

      if (players.length !== playerIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more players not found'
        })
      }

      // Defensive user creation: Create users for players that don't have them
      const playersWithoutUsers = players.filter(p => !p.user)
      if (playersWithoutUsers.length > 0) {
        try {
          await ctx.prisma.$transaction(
            playersWithoutUsers.map(player =>
              ctx.prisma.user.create({
                data: {
                  id: player.userId,
                  email: `player-${player.id}@placeholder.com`, // Placeholder email
                  name: `Player ${player.id.slice(0, 8)}`, // Placeholder name
                  role: 'player',
                },
              })
            )
          )
        } catch (error) {
          console.error('Error creating User records for existing players:', error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Some player data is corrupted. Please contact support.'
          })
        }
      }

      // Verify all decks exist and match tournament if provided
      const deckIds = input.entries
        .map(e => e.deckId)
        .filter((id): id is string => id !== undefined)

      if (deckIds.length > 0) {
        const decks = await ctx.prisma.deck.findMany({
          where: { id: { in: deckIds } },
        })

        const invalidDecks = decks.filter(deck => 
          deck.gameId !== tournament.gameId || 
          deck.format !== tournament.format
        )

        if (invalidDecks.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'One or more decks do not match tournament game/format'
          })
        }
      }

      // Check for existing entries
      const existingEntries = await ctx.prisma.tournamentEntry.findMany({
        where: {
          tournamentId: input.tournamentId,
          playerId: { in: playerIds },
        },
      })

      if (existingEntries.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `${existingEntries.length} players are already entered in this tournament`
        })
      }

      // Create entries
      const createdEntries = await ctx.prisma.$transaction(
        input.entries.map(entry =>
          ctx.prisma.tournamentEntry.create({
            data: {
              tournamentId: input.tournamentId,
              ...entry,
            },
            include: {
              player: {
                select: {
                  user: {
                    select: {
                      firstName: true,
                      name: true,
                    },
                  },
                },
              },
              deck: {
                select: {
                  name: true,
                  archetype: true,
                },
              },
            },
          })
        )
      )

      return {
        success: true,
        message: `Successfully created ${createdEntries.length} tournament entries`,
        entries: createdEntries,
      }
    }),
})