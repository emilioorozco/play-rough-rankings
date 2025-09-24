// Export consolidated store types

// Re-export commonly used types for convenience
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
