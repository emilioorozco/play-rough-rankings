/**
 * Tournament formatting utilities for consistent display across components
 */

/**
 * Format tournament level for display (LOCAL -> Local, REGIONAL -> Regional, etc.)
 */
export function formatTournamentLevel(level: string): string {
  if (!level) return '';
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
}

/**
 * Format tournament status for display (UPCOMING -> Upcoming, etc.)
 */
export function formatTournamentStatus(status: string): string {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

/**
 * Get tournament level badge variant for consistent styling
 */
export function getTournamentLevelBadgeVariant(level: string): string {
  switch (level) {
    case 'LOCAL':
      return 'secondary';
    case 'REGIONAL':
      return 'warning';
    case 'NATIONAL':
      return 'error';
    case 'INTERNATIONAL':
      return 'accent';
    default:
      return 'outline';
  }
}

/**
 * Get tournament status badge variant for consistent styling
 */
export function getTournamentStatusBadgeVariant(status: string): string {
  switch (status) {
    case 'UPCOMING':
      return 'upcoming';
    case 'ACTIVE':
      return 'active';
    case 'COMPLETED':
      return 'completed';
    default:
      return 'outline';
  }
}