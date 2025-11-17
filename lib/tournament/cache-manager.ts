/**
 * Tournament Cache Manager
 * 
 * Centralized caching system for tournament data to improve performance
 * and reduce database queries. Implements TTL-based caching with automatic
 * invalidation strategies.
 */

import { Tournament, TournamentEntry, Match } from '@prisma/client'

/**
 * Cache entry with TTL tracking
 */
interface CacheEntry<T> {
  /** Cached data */
  data: T
  /** Timestamp when cache was created */
  timestamp: Date
  /** Optional version/hash for cache validation */
  version?: string
}

/**
 * Tournament state cache entry
 */
interface TournamentStateCache {
  tournament: Tournament
  entries: TournamentEntry[]
  matches: Match[]
  completedMatchCount: number
}

/**
 * Cache configuration
 */
interface CacheConfig {
  /** Time-to-live in milliseconds */
  ttl: number
  /** Maximum cache size (number of entries) */
  maxSize: number
}

/**
 * Default cache configurations
 */
const DEFAULT_CACHE_CONFIG: Record<string, CacheConfig> = {
  tournamentState: {
    ttl: 2 * 60 * 1000, // 2 minutes
    maxSize: 100
  },
  standings: {
    ttl: 1 * 60 * 1000, // 1 minute
    maxSize: 50
  },
  pairingHistory: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 50
  }
}

/**
 * CacheManager class for tournament data caching
 */
export class CacheManager {
  private tournamentStateCache: Map<string, CacheEntry<TournamentStateCache>> = new Map()
  private standingsCache: Map<string, CacheEntry<any>> = new Map()
  private pairingHistoryCache: Map<string, CacheEntry<Map<string, Set<string>>>> = new Map()
  
  private config: Record<string, CacheConfig>

  constructor(config?: Partial<Record<string, CacheConfig>>) {
    this.config = {
      ...DEFAULT_CACHE_CONFIG,
      ...(config || {})
    } as Record<string, CacheConfig>
  }

  /**
   * Get cached tournament state
   * 
   * @param tournamentId - ID of the tournament
   * @returns Cached tournament state or null if not found/expired
   */
  getTournamentState(tournamentId: string): TournamentStateCache | null {
    return this.getFromCache(
      this.tournamentStateCache,
      tournamentId,
      this.config.tournamentState.ttl
    )
  }

  /**
   * Cache tournament state
   * 
   * @param tournamentId - ID of the tournament
   * @param state - Tournament state to cache
   */
  cacheTournamentState(tournamentId: string, state: TournamentStateCache): void {
    this.setInCache(
      this.tournamentStateCache,
      tournamentId,
      state,
      this.config.tournamentState.maxSize
    )
  }

  /**
   * Get cached standings
   * 
   * @param tournamentId - ID of the tournament
   * @returns Cached standings or null if not found/expired
   */
  getStandings(tournamentId: string): any | null {
    return this.getFromCache(
      this.standingsCache,
      tournamentId,
      this.config.standings.ttl
    )
  }

  /**
   * Cache standings
   * 
   * @param tournamentId - ID of the tournament
   * @param standings - Standings to cache
   */
  cacheStandings(tournamentId: string, standings: any): void {
    this.setInCache(
      this.standingsCache,
      tournamentId,
      standings,
      this.config.standings.maxSize
    )
  }

  /**
   * Get cached pairing history
   * 
   * @param tournamentId - ID of the tournament
   * @returns Cached pairing history or null if not found/expired
   */
  getPairingHistory(tournamentId: string): Map<string, Set<string>> | null {
    return this.getFromCache(
      this.pairingHistoryCache,
      tournamentId,
      this.config.pairingHistory.ttl
    )
  }

  /**
   * Cache pairing history
   * 
   * @param tournamentId - ID of the tournament
   * @param history - Pairing history to cache
   */
  cachePairingHistory(tournamentId: string, history: Map<string, Set<string>>): void {
    this.setInCache(
      this.pairingHistoryCache,
      tournamentId,
      history,
      this.config.pairingHistory.maxSize
    )
  }

  /**
   * Invalidate all caches for a tournament
   * 
   * @param tournamentId - ID of the tournament
   */
  invalidateTournament(tournamentId: string): void {
    this.tournamentStateCache.delete(tournamentId)
    this.standingsCache.delete(tournamentId)
    this.pairingHistoryCache.delete(tournamentId)
  }

  /**
   * Invalidate tournament state cache when matches change
   * 
   * @param tournamentId - ID of the tournament
   */
  invalidateOnMatchUpdate(tournamentId: string): void {
    this.tournamentStateCache.delete(tournamentId)
    this.standingsCache.delete(tournamentId)
    // Keep pairing history as it doesn't change with match results
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.tournamentStateCache.clear()
    this.standingsCache.clear()
    this.pairingHistoryCache.clear()
  }

  /**
   * Get cache statistics
   * 
   * @returns Cache statistics for monitoring
   */
  getStats(): {
    tournamentState: { size: number; maxSize: number }
    standings: { size: number; maxSize: number }
    pairingHistory: { size: number; maxSize: number }
  } {
    return {
      tournamentState: {
        size: this.tournamentStateCache.size,
        maxSize: this.config.tournamentState.maxSize
      },
      standings: {
        size: this.standingsCache.size,
        maxSize: this.config.standings.maxSize
      },
      pairingHistory: {
        size: this.pairingHistoryCache.size,
        maxSize: this.config.pairingHistory.maxSize
      }
    }
  }

  /**
   * Generic cache getter with TTL validation
   * 
   * @param cache - Cache map to get from
   * @param key - Cache key
   * @param ttl - Time-to-live in milliseconds
   * @returns Cached data or null if not found/expired
   */
  private getFromCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    ttl: number
  ): T | null {
    const entry = cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if cache is still valid (within TTL)
    const now = new Date()
    const cacheAge = now.getTime() - entry.timestamp.getTime()
    
    if (cacheAge > ttl) {
      // Cache expired
      cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Generic cache setter with size limit enforcement
   * 
   * @param cache - Cache map to set in
   * @param key - Cache key
   * @param data - Data to cache
   * @param maxSize - Maximum cache size
   */
  private setInCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    data: T,
    maxSize: number
  ): void {
    // Enforce cache size limit using LRU strategy
    if (cache.size >= maxSize && !cache.has(key)) {
      // Remove oldest entry
      const firstKey = cache.keys().next().value
      if (firstKey) {
        cache.delete(firstKey)
      }
    }

    cache.set(key, {
      data,
      timestamp: new Date()
    })
  }
}

/**
 * Singleton cache manager instance
 */
export const cacheManager = new CacheManager()
