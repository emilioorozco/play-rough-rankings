/**
 * Centralized Type Exports
 * 
 * This file provides convenient re-exports of commonly used types from
 * across the type system. This allows for clean imports like:
 * 
 * ```typescript
 * import type { ApiTournament, CreateTournament, TournamentStore } from '@/lib/types'
 * ```
 * 
 * @see lib/types/api.ts - API response types
 * @see lib/types/backend.ts - Backend operation types
 * @see lib/types/stores.ts - Client-side store types
 * @see lib/types/validation.ts - Validation and Zod schema types
 */

// ============================================================================
// API Types
// ============================================================================

export type {
  // Base types
  ApiPlayer,
  ApiGameInfo,
  ApiStoreInfo,
  ApiOrganizerInfo,
  ApiMatch,
  ApiParticipant,
  ApiSeasonalStats,
  ApiPeriodStats,
  ApiPerformance,
  // Main types
  ApiGame,
  ApiPlayerGameStats,
  ApiTournament,
  ApiTournamentListItem,
  ApiTournamentListResponse,
  ApiLeaderboardEntry,
  ApiLeaderboardData,
  ApiPlayerSearchResult,
  // Utility types
  TRPCQueryResult,
  SafeSeasonalStats,
  GameStatsMetadata,
} from './api'

// ============================================================================
// Validation Types (Zod Schema Types)
// ============================================================================

export type {
  // Core entities
  Game,
  CreateGame,
  Player,
  CreatePlayer,
  UpdatePlayer,
  PlayerGameStats,
  CreatePlayerGameStats,
  Store,
  CreateStore,
  UpdateStore,
  Tournament as ValidationTournament,
  CreateTournament,
  UpdateTournament,
  Match,
  CreateMatch,
  UpdateMatch,
  Deck,
  CreateDeck,
  UpdateDeck,
  TournamentEntry,
  CreateTournamentEntry,
  UpdateTournamentEntry,
  // Auth
  AuthUser,
  UserPreferences as ValidationUserPreferences,
  CreateUserPreferences,
  UpdateUserPreferences,
  // API input/output
  ExternalPlayerId,
  TournamentFileUpload,
  PlayerSearch,
  LeaderboardQuery,
  TournamentListQuery,
  DeckStatsQuery,
  DeckUsageQuery,
  ErrorResponse,
  // Form validation
  LoginFormData,
  RegisterFormData,
  ProfileUpdateFormData,
  ProfileCompletionFormData,
  TournamentCreateFormData,
  TournamentRegistrationFormData,
  UserPreferencesFormData,
  SearchFormData,
  ContactFormData,
  FeedbackFormData,
} from './validation'

// Export validation type guards
export {
  isGame,
  isPlayer,
  isTournament,
  isMatch,
  isDeck,
  isTournamentEntry,
} from './validation'

// ============================================================================
// Store Types
// ============================================================================

export type {
  // UI Store
  ModalConfig,
  ConfirmationConfig,
  UIStore,
  UseModalReturn,
  UseConfirmationModalReturn,
  UseTabReturn,
  UseFilterReturn,
  UseInteractionReturn,
  
  // Tournament Store
  Tournament,
  RegistrationStatus,
  TournamentFilters,
  TournamentStore,
  UseCurrentTournamentReturn,
  UseTournamentListReturn,
  UseTournamentRegistrationStatusReturn,
  
  // User Preferences Store
  UserPreferences,
  DisplayPreferences,
  CommunicationPreferences,
  FormBehaviorPreferences,
  UserPreferencesStore,
  UseUserPreferenceReturn,
  UseUserPreferencesReturn,
  
  // Form Draft Store
  ExtendedFormDraft,
  FormDraftStore,
  UseFormDraftReturn,
  UseFormDraftsReturn,
  UseAutoSaveReturn,
  
  // Loading Store
  LoadingStore,
  UseLoadingReturn,
  UseErrorReturn,
  UseProgressReturn,
  UseLoadingBarReturn,
  UseAsyncOperationReturn,
  
  // App Store
  AppStore,
} from './stores'

// App Store hook return types (defined only in app-store.ts)
export type {
  UseThemeReturn,
  UseActivityReturn,
  UseRealtimeReturn,
} from './app-store'

// ============================================================================
// Backend Types
// ============================================================================

// Re-export commonly used backend types
export type {
  PrismaTransaction,
  SeasonalStatsUpdate,
  TournamentStanding,
  PlayerTournamentStats,
  DateFilterClause,
  DateRangeFilter,
  GameUpdateData,
  CSVRowData,
  TournamentFileMetadata,
  PlayerFileData,
  FileFormat,
  TournamentEntryMetadata,
  DeckStatsFilter,
  DeckStatsResult,
  LeaderboardFilter,
  LeaderboardEntry,
  TournamentProcessingResult,
  PlayerStatsUpdate,
  MatchProcessingResult,
  BatchMatchProcessingResult,
  TournamentWhereClause,
  MatchWhereClause,
  PlayerWhereClause,
} from './backend'

// Re-export backend type guards
export {
  // JSON field type guards
  isSeasonalStats,
  isExternalPlayerIds,
  isTournamentEntryMetadata,
  isTournamentMetadata,
  isDeckMetadata,
  isPlayerMetadata,
  isPlayerGameStatsMetadata,
  isFileFormat,
  // Filter and query type guards
  isDateFilter,
  // Game metadata type guards
  isGameMetadata,
  // User preferences and form data type guards
  isUserPreferences,
  isFormDraftData,
} from './backend'
