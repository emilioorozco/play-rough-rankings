/**
 * Validation Types
 * 
 * This file contains TypeScript types inferred from Zod validation schemas.
 * These types are used for runtime validation and type safety at API boundaries.
 * 
 * All types in this file are derived from Zod schemas using `z.infer<typeof Schema>`.
 * This ensures type safety is maintained when schemas change.
 * 
 * @see lib/schemas.ts - Core validation schemas
 * @see lib/validation/schemas.ts - Form validation schemas
 */

import {
  // Core schemas
  GameSchema,
  CreateGameSchema,
  PlayerSchema,
  CreatePlayerSchema,
  UpdatePlayerSchema,
  PlayerGameStatsSchema,
  CreatePlayerGameStatsSchema,
  StoreSchema,
  CreateStoreSchema,
  UpdateStoreSchema,
  TournamentSchema,
  CreateTournamentSchema,
  UpdateTournamentSchema,
  MatchSchema,
  CreateMatchSchema,
  UpdateMatchSchema,
  DeckSchema,
  CreateDeckSchema,
  UpdateDeckSchema,
  TournamentEntrySchema,
  CreateTournamentEntrySchema,
  UpdateTournamentEntrySchema,
  // Auth schemas
  AuthUserSchema,
  UserPreferencesSchema,
  CreateUserPreferencesSchema,
  UpdateUserPreferencesSchema,
  // API input/output schemas
  ExternalPlayerIdSchema,
  TournamentFileUploadSchema,
  PlayerSearchSchema,
  LeaderboardQuerySchema,
  TournamentListQuerySchema,
  DeckStatsQuerySchema,
  DeckUsageQuerySchema,
  ErrorResponseSchema,
} from '@/lib/schemas'

import {
  // Form schemas
  loginSchema,
  registerSchema,
  profileUpdateSchema,
  profileCompletionSchema,
  tournamentCreateSchema,
  tournamentRegistrationSchema,
  userPreferencesSchema,
  searchSchema,
  contactSchema,
  feedbackSchema,
} from '@/lib/validation/schemas'

import { z } from 'zod'

// ============================================================================
// CORE ENTITY TYPES - Database Models
// ============================================================================

/**
 * Game entity type
 * Represents a card game in the system (e.g., Pokemon TCG, Magic: The Gathering)
 */
export type Game = z.infer<typeof GameSchema>

/**
 * Game creation input type
 * Used when creating a new game
 */
export type CreateGame = z.infer<typeof CreateGameSchema>

/**
 * Player entity type
 * Represents a player's gaming profile linked to a user account
 */
export type Player = z.infer<typeof PlayerSchema>

/**
 * Player creation input type
 * Used when creating a new player profile
 */
export type CreatePlayer = z.infer<typeof CreatePlayerSchema>

/**
 * Player update input type
 * Used when updating an existing player profile
 */
export type UpdatePlayer = z.infer<typeof UpdatePlayerSchema>

/**
 * Player game statistics type
 * Represents a player's statistics for a specific game
 */
export type PlayerGameStats = z.infer<typeof PlayerGameStatsSchema>

/**
 * Player game statistics creation input type
 * Used when creating new player game statistics
 */
export type CreatePlayerGameStats = z.infer<typeof CreatePlayerGameStatsSchema>

/**
 * Store entity type
 * Represents a tournament venue/store location
 */
export type Store = z.infer<typeof StoreSchema>

/**
 * Store creation input type
 * Used when creating a new store
 */
export type CreateStore = z.infer<typeof CreateStoreSchema>

/**
 * Store update input type
 * Used when updating an existing store
 */
export type UpdateStore = z.infer<typeof UpdateStoreSchema>

/**
 * Tournament entity type
 * Represents a tournament event
 */
export type Tournament = z.infer<typeof TournamentSchema>

/**
 * Tournament creation input type
 * Used when creating a new tournament
 */
export type CreateTournament = z.infer<typeof CreateTournamentSchema>

/**
 * Tournament update input type
 * Used when updating an existing tournament
 */
export type UpdateTournament = z.infer<typeof UpdateTournamentSchema>

/**
 * Match entity type
 * Represents a match between two players in a tournament
 */
export type Match = z.infer<typeof MatchSchema>

/**
 * Match creation input type
 * Used when creating a new match
 */
export type CreateMatch = z.infer<typeof CreateMatchSchema>

/**
 * Match update input type
 * Used when updating an existing match
 */
export type UpdateMatch = z.infer<typeof UpdateMatchSchema>

/**
 * Deck entity type
 * Represents a deck used in tournaments
 */
export type Deck = z.infer<typeof DeckSchema>

/**
 * Deck creation input type
 * Used when creating a new deck
 */
export type CreateDeck = z.infer<typeof CreateDeckSchema>

/**
 * Deck update input type
 * Used when updating an existing deck
 */
export type UpdateDeck = z.infer<typeof UpdateDeckSchema>

/**
 * Tournament entry type
 * Represents a player's registration in a tournament
 */
export type TournamentEntry = z.infer<typeof TournamentEntrySchema>

/**
 * Tournament entry creation input type
 * Used when creating a new tournament entry
 */
export type CreateTournamentEntry = z.infer<typeof CreateTournamentEntrySchema>

/**
 * Tournament entry update input type
 * Used when updating an existing tournament entry
 */
export type UpdateTournamentEntry = z.infer<typeof UpdateTournamentEntrySchema>

// ============================================================================
// AUTHENTICATION & USER TYPES
// ============================================================================

/**
 * Authenticated user type
 * Represents a user from Better Auth with role information
 */
export type AuthUser = z.infer<typeof AuthUserSchema>

/**
 * User preferences type
 * Represents a user's application preferences
 */
export type UserPreferences = z.infer<typeof UserPreferencesSchema>

/**
 * User preferences creation input type
 * Used when creating new user preferences
 */
export type CreateUserPreferences = z.infer<typeof CreateUserPreferencesSchema>

/**
 * User preferences update input type
 * Used when updating existing user preferences
 */
export type UpdateUserPreferences = z.infer<typeof UpdateUserPreferencesSchema>

// ============================================================================
// API INPUT/OUTPUT TYPES
// ============================================================================

/**
 * External player ID type
 * Represents a player's ID in an external game system
 */
export type ExternalPlayerId = z.infer<typeof ExternalPlayerIdSchema>

/**
 * Tournament file upload type
 * Used when uploading tournament result files
 */
export type TournamentFileUpload = z.infer<typeof TournamentFileUploadSchema>

/**
 * Player search query type
 * Used for searching players by name or other criteria
 */
export type PlayerSearch = z.infer<typeof PlayerSearchSchema>

/**
 * Leaderboard query type
 * Used for querying leaderboard data
 */
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>

/**
 * Tournament list query type
 * Used for querying tournament lists with filters
 */
export type TournamentListQuery = z.infer<typeof TournamentListQuerySchema>

/**
 * Deck statistics query type
 * Used for querying deck usage statistics
 */
export type DeckStatsQuery = z.infer<typeof DeckStatsQuerySchema>

/**
 * Deck usage query type
 * Used for querying deck usage by player or tournament
 */
export type DeckUsageQuery = z.infer<typeof DeckUsageQuerySchema>

/**
 * Error response type
 * Standard error response format for API errors
 */
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

// ============================================================================
// FORM VALIDATION TYPES
// ============================================================================

/**
 * Login form data type
 * Used for user login form validation
 */
export type LoginFormData = z.infer<typeof loginSchema>

/**
 * Registration form data type
 * Used for user registration form validation
 */
export type RegisterFormData = z.infer<typeof registerSchema>

/**
 * Profile update form data type
 * Used for profile update form validation
 */
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>

/**
 * Profile completion form data type
 * Used for profile completion form validation
 */
export type ProfileCompletionFormData = z.infer<typeof profileCompletionSchema>

/**
 * Tournament creation form data type
 * Used for tournament creation form validation
 */
export type TournamentCreateFormData = z.infer<typeof tournamentCreateSchema>

/**
 * Tournament registration form data type
 * Used for tournament registration form validation
 */
export type TournamentRegistrationFormData = z.infer<typeof tournamentRegistrationSchema>

/**
 * User preferences form data type
 * Used for user preferences form validation
 */
export type UserPreferencesFormData = z.infer<typeof userPreferencesSchema>

/**
 * Search form data type
 * Used for search form validation
 */
export type SearchFormData = z.infer<typeof searchSchema>

/**
 * Contact form data type
 * Used for contact form validation
 */
export type ContactFormData = z.infer<typeof contactSchema>

/**
 * Feedback form data type
 * Used for feedback form validation
 */
export type FeedbackFormData = z.infer<typeof feedbackSchema>

// ============================================================================
// TYPE GUARDS FOR VALIDATION
// ============================================================================

/**
 * Type guard to check if a value matches the Game type
 * @param value - Value to check
 * @returns True if value matches Game type
 */
export function isGame(value: unknown): value is Game {
  return typeof value === 'object' && value !== null && 'id' in value && 'name' in value
}

/**
 * Type guard to check if a value matches the Player type
 * @param value - Value to check
 * @returns True if value matches Player type
 */
export function isPlayer(value: unknown): value is Player {
  return typeof value === 'object' && value !== null && 'id' in value && 'userId' in value
}

/**
 * Type guard to check if a value matches the Tournament type
 * @param value - Value to check
 * @returns True if value matches Tournament type
 */
export function isTournament(value: unknown): value is Tournament {
  return typeof value === 'object' && value !== null && 'id' in value && 'name' in value && 'gameId' in value
}

/**
 * Type guard to check if a value matches the Match type
 * @param value - Value to check
 * @returns True if value matches Match type
 */
export function isMatch(value: unknown): value is Match {
  return typeof value === 'object' && value !== null && 'id' in value && 'tournamentId' in value && 'player1Id' in value && 'player2Id' in value
}

/**
 * Type guard to check if a value matches the Deck type
 * @param value - Value to check
 * @returns True if value matches Deck type
 */
export function isDeck(value: unknown): value is Deck {
  return typeof value === 'object' && value !== null && 'id' in value && 'name' in value && 'gameId' in value
}

/**
 * Type guard to check if a value matches the TournamentEntry type
 * @param value - Value to check
 * @returns True if value matches TournamentEntry type
 */
export function isTournamentEntry(value: unknown): value is TournamentEntry {
  return typeof value === 'object' && value !== null && 'id' in value && 'tournamentId' in value && 'playerId' in value
}

