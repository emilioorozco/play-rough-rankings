/**
 * Example usage of ProjectedRatingsDisplay component
 * 
 * This file demonstrates how to integrate the ProjectedRatingsDisplay
 * component into a tournament details page.
 */

import { ProjectedRatingsDisplay } from './projected-ratings-display'
import type { ProjectedRating } from '@/lib/tournament/types'

/**
 * Example: Basic usage in a tournament details page
 */
export function TournamentDetailsWithProjectedRatings({ tournamentId }: { tournamentId: string }) {
  return (
    <div className="space-y-6">
      {/* Other tournament sections */}
      
      {/* Projected Ratings Section */}
      <ProjectedRatingsDisplay tournamentId={tournamentId} />
      
      {/* More tournament sections */}
    </div>
  )
}

/**
 * Example: With callback to track rating updates
 */
export function TournamentDetailsWithRatingTracking({ tournamentId }: { tournamentId: string }) {
  const handleRatingsUpdate = (ratings: ProjectedRating[]) => {
    console.log('Projected ratings updated:', ratings)
    
    // You can use this to:
    // - Update other UI components
    // - Show notifications
    // - Track analytics
    // - Update local state
  }

  return (
    <div className="space-y-6">
      <ProjectedRatingsDisplay 
        tournamentId={tournamentId}
        onRatingsUpdate={handleRatingsUpdate}
      />
    </div>
  )
}

/**
 * Example: Conditional rendering based on tournament status
 */
export function TournamentDetailsConditional({ 
  tournamentId,
  tournamentStatus 
}: { 
  tournamentId: string
  tournamentStatus: string 
}) {
  // Only show projected ratings for active tournaments
  const showProjectedRatings = tournamentStatus === 'ACTIVE'

  return (
    <div className="space-y-6">
      {showProjectedRatings && (
        <ProjectedRatingsDisplay tournamentId={tournamentId} />
      )}
    </div>
  )
}
