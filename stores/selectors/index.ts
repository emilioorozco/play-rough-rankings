// UI Store Selectors
export {
  useModalSelectors,
  useTabSelectors,
  useFilterSelectors,
  useInteractionSelectors,
  useUIActions,
  useUIStoreSelectors,
  useOptimizedUISelectors,
} from '../ui-store-selectors'

// Tournament Store Selectors
export {
  useTournamentDataSelectors,
  useTournamentListSelectors,
  useRegistrationStatusSelectors,
  useTournamentFilterSelectors,
  useTournamentActions,
  useTournamentStoreSelectors,
  useOptimizedTournamentSelectors,
} from '../tournament-store-selectors'

// User Preferences Store Selectors
export {
  usePreferenceSelectors,
  useCategorySelectors,
  useSpecificPreferenceSelectors,
  useUserPreferencesActions,
  useUserPreferencesStoreSelectors,
  useOptimizedUserPreferencesSelectors,
} from '../user-preferences-store-selectors'

// Form Draft Store Selectors
export {
  useDraftSelectors,
  useDraftListSelectors,
  useDraftManagementSelectors,
  useFormDraftActions,
  useFormDraftStoreSelectors,
  useOptimizedFormDraftSelectors,
} from '../form-draft-store-selectors'

// Loading Store Selectors
export {
  useLoadingSelectors,
  useErrorSelectors,
  useProgressSelectors,
  useLoadingActions,
  useLoadingStoreSelectors,
  useOptimizedLoadingSelectors,
} from '../loading-store-selectors'

// Auth Store Selectors
export {
  useAuthRoleSelectors,
  useAuthPermissionSelectors,
  useAuthUISelectors,
} from '../auth-store-selectors'

// Re-export the original store hooks for convenience
export { useUIStore } from '../ui-store'
export { useTournamentStore } from '../tournament-store'
export { useUserPreferencesStore } from '../user-preferences-store'
export { useFormDraftStore } from '../form-draft-store'
export { useLoadingStore } from '../loading-store'
export { useAuthStore } from '../auth-store'

// Re-export the original store hooks that were already optimized
export { useModal, useTab, useFilters, useInteractions, useConfirmationModal } from '../ui-store'
export { useCurrentTournament, useTournamentList, useRegistrationStatus } from '../tournament-store'
export { useUserPreferences, useUserPreference, useUserPreferencesByCategory } from '../user-preferences-store'
export { useFormDraft, useFormDraftsByType, useActiveFormDraft } from '../form-draft-store'
export { useLoadingBar, useLoading, useError } from '../loading-store'
export { useRequiredRole, useRoleAccess, usePermissions } from '../auth-store'
