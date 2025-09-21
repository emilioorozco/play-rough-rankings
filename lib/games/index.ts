// Export all game-related functionality
export * from './base-game';
export * from './pokemon-tcg';
export * from './game-registry';

// Re-export commonly used types and functions
export type { BaseGame, MatchResult, GameMetadata, RatingCalculationResult } from './base-game';
export { PokemonTCGGame } from './pokemon-tcg';
export {
  getGame,
  getGameOrThrow,
  getAllGames,
  getActiveGames,
  hasGame,
  getGameIds,
  getGamesAsJSON,
  getActiveGamesAsJSON,
  gameRegistry,
} from './game-registry';
