import { z } from "zod";

/**
 * Zod Schema Definitions
 * 
 * This file contains all Zod validation schemas used throughout the application.
 * Schemas are organized by domain and exported for use in:
 * - tRPC procedure input validation
 * - Form validation
 * - API request/response validation
 * 
 * **Schema Organization:**
 * - Core entity schemas (Game, Player, Tournament, etc.)
 * - Create/Update schemas (derived from core schemas)
 * - Query schemas (for filtering and pagination)
 * - Form schemas (moved to lib/validation/schemas.ts)
 * 
 * **Type Inference:**
 * - All schema types are exported via `z.infer<typeof SchemaName>`
 * - Type exports are in `lib/types/validation.ts` for centralized access
 * - tRPC automatically infers input types from Zod schemas
 * 
 * **Best Practices:**
 * - Extract reusable schemas from inline definitions
 * - Use `.omit()`, `.partial()`, `.pick()` to derive related schemas
 * - Keep simple single-field schemas inline in procedures
 * - Document complex schemas with JSDoc comments
 * 
 * @see lib/types/validation.ts - TypeScript types inferred from these schemas
 */

// ============================================================================
// CORE VALIDATION SCHEMAS
// ============================================================================

// Game Schema (simplified - game logic moved to classes)
export const GameSchema = z.object({
  id: z.string().uuid(),
  name: z.string(), // Game name (e.g., "Pokemon Trading Card Game")
  shortName: z.string().min(1).max(10), // "PTCG"
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Game creation input schema
export const CreateGameSchema = GameSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Player Schema
export const PlayerSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(), // Links to Better Auth user ID
  // External player IDs for different game systems - maps game UUID to player's external ID
  externalPlayerIds: z.record(z.string().uuid(), z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(), // Age groups, preferences, etc.
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Player creation input schema
export const CreatePlayerSchema = PlayerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Player update schema
export const UpdatePlayerSchema = PlayerSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// Player Game Statistics Schema
export const PlayerGameStatsSchema = z.object({
  id: z.string().uuid(),
  playerId: z.string().uuid(),
  gameId: z.string().uuid(),
  currentRating: z.number().int().min(0).default(1200),
  seasonalStats: z.object({
    wins: z.number().int().min(0).default(0),
    losses: z.number().int().min(0).default(0),
    tournaments: z.number().int().min(0).default(0),
    points: z.number().int().min(0).default(0), // Generic points (CP for Pokemon, PWP for MTG, etc.)
  }),
  bestFinish: z.number().int().min(1).optional(), // Best tournament placement
  totalEarnings: z.number().min(0).default(0),
  metadata: z.record(z.string(), z.any()).optional(), // Game-specific achievements, rankings, etc.
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Player Game Stats creation input schema
export const CreatePlayerGameStatsSchema = PlayerGameStatsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Store Schema
export const StoreSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(50),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
  contactEmail: z.string().email().optional(),
  website: z.string().url().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Store creation input schema
export const CreateStoreSchema = StoreSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Store update schema
export const UpdateStoreSchema = StoreSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Tournament Schema
export const TournamentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(), // Tournament description
  gameId: z.string().uuid(), // Links to specific card game
  storeId: z.string().uuid(),
  organizerId: z.string().min(20), // Better Auth User ID (CUID variant)
  date: z.string().datetime().transform((str) => new Date(str)),
  format: z.string().min(1).max(100), // "Standard", "Modern", "Legacy", etc. (game-specific)
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED"]).default("UPCOMING"),
  maxPlayers: z.number().int().min(1).optional(),
  entryFee: z.number().min(0).optional(),
  prizePool: z.string().max(500).optional(),
  tournamentLevel: z
    .enum(["LOCAL", "REGIONAL", "NATIONAL", "INTERNATIONAL"])
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(), // Age groups, sanctioning info, etc.
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Tournament creation input schema
export const CreateTournamentSchema = TournamentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Tournament update schema
export const UpdateTournamentSchema = TournamentSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Match Schema
export const MatchSchema = z.object({
  id: z.string().uuid(),
  tournamentId: z.string().uuid(),
  player1Id: z.string().uuid(),
  player2Id: z.string().uuid(),
  winnerId: z.string().uuid().optional(),
  round: z.number().int().min(1),
  table: z.number().int().min(1).optional(),
  status: z.enum(["PENDING", "ACTIVE", "COMPLETED"]).default("PENDING"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Match creation input schema
export const CreateMatchSchema = MatchSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Match update schema
export const UpdateMatchSchema = MatchSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================================
// BETTER AUTH USER SCHEMAS
// ============================================================================

// Better Auth user context schema (available in tRPC context)
export const AuthUserSchema = z.object({
  id: z.string().min(20), // Better Auth User ID (CUID variant)
  email: z.string().email(),
  name: z.string().optional(), // @deprecated - use firstName and lastName instead
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["player", "organizer", "admin"]).default("player"),
});

// User Preferences Schema
export const UserPreferencesSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  nameDisplayPreference: z.enum(["FIRST_NAME", "FIRST_LAST_NAME", "DISPLAY_NAME", "OPT_OUT"]).default("FIRST_NAME"),
  profileVisibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  optInCommunications: z.boolean().default(false),
  optInTournamentUpdates: z.boolean().default(true),
  optInLeaderboardUpdates: z.boolean().default(true),
  optInMarketing: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// User Preferences creation input schema
export const CreateUserPreferencesSchema = UserPreferencesSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// User Preferences update schema
export const UpdateUserPreferencesSchema = UserPreferencesSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================================
// API INPUT/OUTPUT SCHEMAS
// ============================================================================

// External Player ID validation
export const ExternalPlayerIdSchema = z.object({
  gameId: z.string().uuid(),
  externalId: z.string().min(1).max(50),
});

// Tournament file upload schema
export const TournamentFileUploadSchema = z.object({
  tournamentId: z.string().uuid(),
  fileType: z.enum(["CSV", "JSON", "TDF"]),
  fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
});

// Player search schema
export const PlayerSearchSchema = z.object({
  query: z.string().min(1).max(100),
  gameId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

// Leaderboard query schema
export const LeaderboardQuerySchema = z.object({
  gameId: z.string().uuid(),
  season: z.string().optional(), // "2024-spring", "2024-summer", etc.
  format: z.string().optional(),
  limit: z.number().int().min(10).max(50).default(25),
});

// Tournament listing query schema
export const TournamentListQuerySchema = z.object({
  gameId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  organizerId: z.string().optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED"]).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// ERROR RESPONSE SCHEMA
// ============================================================================

export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.any()).optional(),
  timestamp: z.date(),
});

// ============================================================================
// UTILITY VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates that external player IDs reference existing games
 */
export const validateExternalPlayerIds = (
  externalPlayerIds: Record<string, string> | undefined,
  validGameIds: string[],
): boolean => {
  if (!externalPlayerIds) return true;

  const gameIds = Object.keys(externalPlayerIds);
  return gameIds.every((gameId) => {
    // Validate UUID format
    const uuidResult = z.string().uuid().safeParse(gameId);
    if (!uuidResult.success) return false;

    // Validate game exists
    return validGameIds.includes(gameId);
  });
};

/**
 * Validates UUID format
 */
export const isValidUUID = (value: string): boolean => {
  return z.string().uuid().safeParse(value).success;
};

/**
 * Validates email format
 */
export const isValidEmail = (value: string): boolean => {
  return z.string().email().safeParse(value).success;
};

// ============================================================================
// DECK SCHEMAS
// ============================================================================

// Deck Schema
export const DeckSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  archetype: z.string().min(1).max(50), // "Control", "Aggro", "Combo", etc.
  gameId: z.string().uuid(),
  format: z.string().min(1).max(50), // "Standard", "Expanded", etc.
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.any()).optional(), // Key cards, colors, etc.
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Deck creation input schema
export const CreateDeckSchema = DeckSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Deck update schema
export const UpdateDeckSchema = DeckSchema.partial().omit({
  id: true,
  gameId: true, // Don't allow changing game
  createdAt: true,
  updatedAt: true,
});

// Tournament Entry Schema
export const TournamentEntrySchema = z.object({
  id: z.string().uuid(),
  tournamentId: z.string().uuid(),
  playerId: z.string().uuid(),
  deckId: z.string().uuid().optional(),
  placement: z.number().int().min(1).optional(),
  record: z
    .object({
      wins: z.number().int().min(0).default(0),
      losses: z.number().int().min(0).default(0),
      draws: z.number().int().min(0).default(0),
    })
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Tournament Entry creation input schema
export const CreateTournamentEntrySchema = TournamentEntrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Tournament Entry update schema
export const UpdateTournamentEntrySchema = TournamentEntrySchema.partial().omit(
  {
    id: true,
    tournamentId: true,
    playerId: true,
    createdAt: true,
    updatedAt: true,
  },
);

// Deck statistics query schema
export const DeckStatsQuerySchema = z.object({
  gameId: z.string().uuid(),
  format: z.string().optional(),
  season: z.string().optional(), // "2024-Q1", etc.
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minUsage: z.number().int().min(1).default(1), // Minimum times deck was used
  limit: z.number().int().min(1).max(100).default(20),
});

// Deck usage query schema
export const DeckUsageQuerySchema = z.object({
  deckId: z.string().uuid(),
  playerId: z.string().uuid().optional(),
  season: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// LEADERBOARD QUERY SCHEMAS
// ============================================================================

// Top players query schema
export const TopPlayersQuerySchema = z.object({
  gameId: z.string().uuid(),
  limit: z.number().int().min(10).max(50).default(25),
  format: z.string().optional(),
});

// Filtered leaderboard query schema
export const FilteredLeaderboardQuerySchema = z.object({
  gameId: z.string().uuid(),
  format: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().int().min(10).max(50).default(25),
  minTournaments: z.number().int().min(0).default(1),
});

// Historical seasons query schema
export const HistoricalSeasonsQuerySchema = z.object({
  gameId: z.string().uuid(),
  years: z.number().int().min(1).max(5).default(2),
});

// Available seasons query schema
export const AvailableSeasonsQuerySchema = z.object({
  gameId: z.string().uuid(),
});

// Seasonal cached query schema
export const SeasonalCachedQuerySchema = z.object({
  gameId: z.string().uuid(),
  season: z.string().optional(),
  limit: z.number().int().min(10).max(50).default(25),
});

// Player trends query schema
export const PlayerTrendsQuerySchema = z.object({
  playerId: z.string().uuid(),
  gameId: z.string().uuid(),
  period: z.enum(['week', 'month', 'season']).default('month'),
});

// Refresh cache query schema
export const RefreshCacheQuerySchema = z.object({
  gameId: z.string().uuid(),
  season: z.string().optional(),
});

// Batch refresh cache query schema
export const BatchRefreshCacheQuerySchema = z.object({
  updates: z.array(z.object({
    gameId: z.string().uuid(),
    season: z.string().optional(),
  })).min(1).max(10),
});

// Ranking stats query schema
export const RankingStatsQuerySchema = z.object({
  gameId: z.string().uuid(),
});

// Player deck stats query schema
export const PlayerDeckStatsQuerySchema = z.object({
  playerId: z.string().uuid(),
  gameId: z.string().uuid(),
  season: z.string().optional(),
});

// ============================================================================
// TOURNAMENT ENTRIES QUERY SCHEMAS
// ============================================================================

// Tournament entries by tournament query schema
export const TournamentEntriesByTournamentQuerySchema = z.object({
  tournamentId: z.string().uuid(),
  includeDeckInfo: z.boolean().default(true),
});

// Tournament entries by player query schema
export const TournamentEntriesByPlayerQuerySchema = z.object({
  playerId: z.string().uuid(),
  gameId: z.string().uuid().optional(),
  includeDeckInfo: z.boolean().default(true),
  limit: z.number().int().min(1).max(100).default(20),
});

// Bulk create tournament entries schema
export const BulkCreateTournamentEntriesSchema = z.object({
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
});

// ============================================================================
// DECKS QUERY SCHEMAS
// ============================================================================

// Deck list query schema
export const DeckListQuerySchema = z.object({
  gameId: z.string().uuid(),
  format: z.string().optional(),
  archetype: z.string().optional(),
  includeInactive: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
});

// Deck by ID query schema
export const DeckByIdQuerySchema = z.object({
  id: z.string().uuid(),
  includeStats: z.boolean().default(true),
});

// Deck archetypes query schema
export const DeckArchetypesQuerySchema = z.object({
  gameId: z.string().uuid(),
  format: z.string().optional(),
  season: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Export TypeScript types from Zod schemas
export type Game = z.infer<typeof GameSchema>;
export type CreateGame = z.infer<typeof CreateGameSchema>;

export type Player = z.infer<typeof PlayerSchema>;
export type CreatePlayer = z.infer<typeof CreatePlayerSchema>;
export type UpdatePlayer = z.infer<typeof UpdatePlayerSchema>;

export type PlayerGameStats = z.infer<typeof PlayerGameStatsSchema>;
export type CreatePlayerGameStats = z.infer<typeof CreatePlayerGameStatsSchema>;

export type Store = z.infer<typeof StoreSchema>;
export type CreateStore = z.infer<typeof CreateStoreSchema>;
export type UpdateStore = z.infer<typeof UpdateStoreSchema>;

export type Tournament = z.infer<typeof TournamentSchema>;
export type CreateTournament = z.infer<typeof CreateTournamentSchema>;
export type UpdateTournament = z.infer<typeof UpdateTournamentSchema>;

export type Match = z.infer<typeof MatchSchema>;
export type CreateMatch = z.infer<typeof CreateMatchSchema>;
export type UpdateMatch = z.infer<typeof UpdateMatchSchema>;

export type Deck = z.infer<typeof DeckSchema>;
export type CreateDeck = z.infer<typeof CreateDeckSchema>;
export type UpdateDeck = z.infer<typeof UpdateDeckSchema>;

export type TournamentEntry = z.infer<typeof TournamentEntrySchema>;
export type CreateTournamentEntry = z.infer<typeof CreateTournamentEntrySchema>;
export type UpdateTournamentEntry = z.infer<typeof UpdateTournamentEntrySchema>;

export type AuthUser = z.infer<typeof AuthUserSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type CreateUserPreferences = z.infer<typeof CreateUserPreferencesSchema>;
export type UpdateUserPreferences = z.infer<typeof UpdateUserPreferencesSchema>;
export type ExternalPlayerId = z.infer<typeof ExternalPlayerIdSchema>;
export type TournamentFileUpload = z.infer<typeof TournamentFileUploadSchema>;
export type PlayerSearch = z.infer<typeof PlayerSearchSchema>;
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;
export type TournamentListQuery = z.infer<typeof TournamentListQuerySchema>;
export type DeckStatsQuery = z.infer<typeof DeckStatsQuerySchema>;
export type DeckUsageQuery = z.infer<typeof DeckUsageQuerySchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Leaderboard query types
export type TopPlayersQuery = z.infer<typeof TopPlayersQuerySchema>;
export type FilteredLeaderboardQuery = z.infer<typeof FilteredLeaderboardQuerySchema>;
export type HistoricalSeasonsQuery = z.infer<typeof HistoricalSeasonsQuerySchema>;
export type AvailableSeasonsQuery = z.infer<typeof AvailableSeasonsQuerySchema>;
export type SeasonalCachedQuery = z.infer<typeof SeasonalCachedQuerySchema>;
export type PlayerTrendsQuery = z.infer<typeof PlayerTrendsQuerySchema>;
export type RefreshCacheQuery = z.infer<typeof RefreshCacheQuerySchema>;
export type BatchRefreshCacheQuery = z.infer<typeof BatchRefreshCacheQuerySchema>;
export type RankingStatsQuery = z.infer<typeof RankingStatsQuerySchema>;
export type PlayerDeckStatsQuery = z.infer<typeof PlayerDeckStatsQuerySchema>;

// Tournament entries query types
export type TournamentEntriesByTournamentQuery = z.infer<typeof TournamentEntriesByTournamentQuerySchema>;
export type TournamentEntriesByPlayerQuery = z.infer<typeof TournamentEntriesByPlayerQuerySchema>;
export type BulkCreateTournamentEntries = z.infer<typeof BulkCreateTournamentEntriesSchema>;

// Decks query types
export type DeckListQuery = z.infer<typeof DeckListQuerySchema>;
export type DeckByIdQuery = z.infer<typeof DeckByIdQuerySchema>;
export type DeckArchetypesQuery = z.infer<typeof DeckArchetypesQuerySchema>;
