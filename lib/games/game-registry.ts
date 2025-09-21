import { BaseGame } from './base-game';
import { PokemonTCGGame } from './pokemon-tcg';

/**
 * Game registry for managing all available games
 * This centralizes game management and provides a single source of truth
 */
class GameRegistry {
  private games = new Map<string, BaseGame>();

  constructor() {
    // Register all available games
    this.registerGame(new PokemonTCGGame());
    // Add more games here as they're implemented
  }

  /**
   * Register a new game
   */
  registerGame(game: BaseGame): void {
    if (this.games.has(game.id)) {
      throw new Error(`Game with id '${game.id}' is already registered`);
    }
    this.games.set(game.id, game);
  }

  /**
   * Get a game by ID
   */
  getGame(id: string): BaseGame | undefined {
    return this.games.get(id);
  }

  /**
   * Get a game by ID, throwing an error if not found
   */
  getGameOrThrow(id: string): BaseGame {
    const game = this.games.get(id);
    if (!game) {
      throw new Error(`Game with id '${id}' not found`);
    }
    return game;
  }

  /**
   * Get all registered games
   */
  getAllGames(): BaseGame[] {
    return Array.from(this.games.values());
  }

  /**
   * Get only active games
   */
  getActiveGames(): BaseGame[] {
    return this.getAllGames().filter(game => game.isActive);
  }

  /**
   * Check if a game exists
   */
  hasGame(id: string): boolean {
    return this.games.has(id);
  }

  /**
   * Get all game IDs
   */
  getGameIds(): string[] {
    return Array.from(this.games.keys());
  }

  /**
   * Get games as JSON for API responses
   */
  getGamesAsJSON() {
    return this.getAllGames().map(game => game.toJSON());
  }

  /**
   * Get active games as JSON for API responses
   */
  getActiveGamesAsJSON() {
    return this.getActiveGames().map(game => game.toJSON());
  }
}

// Create singleton instance
const gameRegistry = new GameRegistry();

// Export convenience functions
export function getGame(id: string): BaseGame | undefined {
  return gameRegistry.getGame(id);
}

export function getGameOrThrow(id: string): BaseGame {
  return gameRegistry.getGameOrThrow(id);
}

export function getAllGames(): BaseGame[] {
  return gameRegistry.getAllGames();
}

export function getActiveGames(): BaseGame[] {
  return gameRegistry.getActiveGames();
}

export function hasGame(id: string): boolean {
  return gameRegistry.hasGame(id);
}

export function getGameIds(): string[] {
  return gameRegistry.getGameIds();
}

export function getGamesAsJSON() {
  return gameRegistry.getGamesAsJSON();
}

export function getActiveGamesAsJSON() {
  return gameRegistry.getActiveGamesAsJSON();
}

// Export the registry instance for advanced usage
export { gameRegistry };
