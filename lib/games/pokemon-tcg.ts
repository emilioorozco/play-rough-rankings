import { BaseGame, MatchResult, GameMetadata, RatingCalculationResult } from './base-game';

/**
 * Pokemon Trading Card Game implementation
 */
export class PokemonTCGGame extends BaseGame {
  readonly id = 'a0b18a4b-b3d0-45c6-930e-821fb243d83b'; // Database UUID
  readonly name = 'Pokémon Trading Card Game';
  readonly shortName = 'PTCG';
  readonly formats = ['Standard', 'Expanded', 'Legacy'];
  readonly isActive = true;

  validateTournamentFormat(format: string): boolean {
    return this.formats.includes(format);
  }

  calculateRatingChange(
    playerRating: number,
    opponentRating: number,
    result: MatchResult
  ): RatingCalculationResult {
    // Pokemon TCG uses Elo rating system with K-factor of 32
    const kFactor = 32;
    const expectedScore = this.calculateExpectedScore(playerRating, opponentRating);
    
    let actualScore: number;
    switch (result) {
      case 'win':
        actualScore = 1;
        break;
      case 'loss':
        actualScore = 0;
        break;
      case 'draw':
        actualScore = 0.5;
        break;
    }

    return this.calculateNewRating(playerRating, expectedScore, actualScore, kFactor);
  }

  getDefaultMetadata(): GameMetadata {
    return {
      maxDeckSize: 60,
      minDeckSize: 60,
      ageGroups: ['Juniors', 'Seniors', 'Masters'],
      pointSystem: 'Swiss',
      maxRounds: 8,
      timeLimit: 30, // minutes
      sanctioning: {
        type: 'Play! Pokemon',
        requiresRegistration: true,
      },
      deckValidation: {
        requiresEnergy: true,
        requiresPokemon: true,
        maxSameCard: 4,
      },
    };
  }

  validateDeck(deck: unknown): boolean {
    // Basic deck validation - can be expanded
    if (!deck || typeof deck !== 'object') {
      return false;
    }

    // For now, just check if it's an object
    // In a real implementation, you'd validate deck composition
    return true;
  }

  // Pokemon TCG specific methods
  getAgeGroups(): string[] {
    return this.getDefaultMetadata().ageGroups as string[];
  }

  getMaxDeckSize(): number {
    return this.getDefaultMetadata().maxDeckSize as number;
  }

  getMinDeckSize(): number {
    return this.getDefaultMetadata().minDeckSize as number;
  }

  getTimeLimit(): number {
    return this.getDefaultMetadata().timeLimit as number;
  }
}
