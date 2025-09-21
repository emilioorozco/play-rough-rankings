/**
 * Base game class that all games must extend
 * Provides common interface and functionality for all games
 */

export type MatchResult = 'win' | 'loss' | 'draw';

export interface GameMetadata {
  [key: string]: unknown;
}

export interface RatingCalculationResult {
  newRating: number;
  ratingChange: number;
}

export abstract class BaseGame {
  // Core game properties - must be implemented by each game
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly shortName: string;
  abstract readonly formats: string[];
  abstract readonly isActive: boolean;

  // Game-specific methods - must be implemented by each game
  abstract validateTournamentFormat(format: string): boolean;
  abstract calculateRatingChange(
    playerRating: number,
    opponentRating: number,
    result: MatchResult
  ): RatingCalculationResult;
  abstract getDefaultMetadata(): GameMetadata;
  abstract validateDeck(deck: unknown): boolean;

  // Common utility methods available to all games
  protected calculateExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  protected calculateNewRating(
    currentRating: number,
    expectedScore: number,
    actualScore: number,
    kFactor: number
  ): RatingCalculationResult {
    const ratingChange = Math.round(kFactor * (actualScore - expectedScore));
    return {
      newRating: currentRating + ratingChange,
      ratingChange,
    };
  }

  // Validation helpers
  isValidFormat(format: string): boolean {
    return this.formats.includes(format);
  }

  isActiveGame(): boolean {
    return this.isActive;
  }

  // Get game info for API responses
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      shortName: this.shortName,
      formats: this.formats,
      isActive: this.isActive,
      metadata: this.getDefaultMetadata(),
    };
  }
}
