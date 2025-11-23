/**
 * Email Rate Limiting System
 * 
 * Provides in-memory rate limiting for email sending to prevent abuse.
 * Can be upgraded to Redis for distributed systems in the future.
 * 
 * Rate limits:
 * - Verification emails: 3 per hour per email address
 * - Password reset emails: 3 per hour per email address
 * - Role invitation emails: 5 per 24 hours per admin
 */

/**
 * Email type for rate limiting
 */
export type EmailType = 'verification' | 'password_reset' | 'role_invitation';

/**
 * Rate limit configuration for each email type
 */
export interface RateLimitConfig {
  /** Maximum number of attempts allowed within the window */
  maxAttempts: number;
  /** Time window duration in milliseconds */
  windowDuration: number;
}

/**
 * Rate limit entry tracking attempts for a specific key
 */
export interface RateLimitEntry {
  /** Unique key (email:type or userId:type) */
  key: string;
  /** Number of attempts in current window */
  count: number;
  /** Start of current rate limit window */
  windowStart: Date;
  /** Window duration in milliseconds */
  windowDuration: number;
  /** Maximum attempts allowed */
  maxAttempts: number;
}

/**
 * Rate limit error thrown when limit is exceeded
 */
export class RateLimitError extends Error {
  /** Timestamp when the user can retry */
  public readonly retryAfter: Date;
  /** Email type that was rate limited */
  public readonly emailType: EmailType;
  /** Email address or user ID that was rate limited */
  public readonly identifier: string;

  constructor(message: string, retryAfter: Date, emailType: EmailType, identifier: string) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.emailType = emailType;
    this.identifier = identifier;
  }
}

/**
 * Rate limit configuration for each email type
 */
export const RATE_LIMITS: Record<EmailType, RateLimitConfig> = {
  verification: {
    maxAttempts: 3,
    windowDuration: 60 * 60 * 1000, // 1 hour
  },
  password_reset: {
    maxAttempts: 3,
    windowDuration: 60 * 60 * 1000, // 1 hour
  },
  role_invitation: {
    maxAttempts: 5,
    windowDuration: 24 * 60 * 60 * 1000, // 24 hours
  },
};

/**
 * In-memory rate limit storage
 * 
 * Maps rate limit keys to their tracking entries.
 * In production, this should be replaced with Redis for distributed systems.
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Generate rate limit key
 * 
 * Creates a unique key for tracking rate limits based on identifier and email type.
 * 
 * @param identifier - Email address or user ID
 * @param emailType - Type of email being sent
 * @returns Unique rate limit key
 */
function generateRateLimitKey(identifier: string, emailType: EmailType): string {
  return `${identifier.toLowerCase()}:${emailType}`;
}

/**
 * Check if rate limit window has expired
 * 
 * @param entry - Rate limit entry to check
 * @returns True if the window has expired
 */
function isWindowExpired(entry: RateLimitEntry): boolean {
  const now = Date.now();
  const windowEnd = entry.windowStart.getTime() + entry.windowDuration;
  return now >= windowEnd;
}

/**
 * Get rate limit entry for a key
 * 
 * Retrieves existing entry or creates a new one if it doesn't exist or has expired.
 * 
 * @param key - Rate limit key
 * @param config - Rate limit configuration
 * @returns Rate limit entry
 */
function getRateLimitEntry(key: string, config: RateLimitConfig): RateLimitEntry {
  const existing = rateLimitStore.get(key);
  
  // If entry exists and window hasn't expired, return it
  if (existing && !isWindowExpired(existing)) {
    return existing;
  }
  
  // Create new entry or reset expired entry
  const newEntry: RateLimitEntry = {
    key,
    count: 0,
    windowStart: new Date(),
    windowDuration: config.windowDuration,
    maxAttempts: config.maxAttempts,
  };
  
  rateLimitStore.set(key, newEntry);
  return newEntry;
}

/**
 * Increment rate limit counter
 * 
 * @param key - Rate limit key
 */
function incrementCounter(key: string): void {
  const entry = rateLimitStore.get(key);
  if (entry) {
    entry.count++;
    rateLimitStore.set(key, entry);
  }
}

/**
 * Calculate retry-after timestamp
 * 
 * @param entry - Rate limit entry
 * @returns Date when the user can retry
 */
function calculateRetryAfter(entry: RateLimitEntry): Date {
  const windowEnd = entry.windowStart.getTime() + entry.windowDuration;
  return new Date(windowEnd);
}

/**
 * Check rate limit for email sending
 * 
 * Validates if an email can be sent based on rate limiting rules.
 * Throws RateLimitError if limit is exceeded.
 * 
 * @param identifier - Email address or user ID to check
 * @param emailType - Type of email being sent
 * @throws RateLimitError if rate limit is exceeded
 */
export function checkRateLimit(identifier: string, emailType: EmailType): void {
  const config = RATE_LIMITS[emailType];
  const key = generateRateLimitKey(identifier, emailType);
  const entry = getRateLimitEntry(key, config);
  
  // Check if limit is exceeded
  if (entry.count >= entry.maxAttempts) {
    const retryAfter = calculateRetryAfter(entry);
    const minutesUntilRetry = Math.ceil((retryAfter.getTime() - Date.now()) / (60 * 1000));
    
    throw new RateLimitError(
      `Rate limit exceeded for ${emailType} emails. Please try again in ${minutesUntilRetry} minute(s).`,
      retryAfter,
      emailType,
      identifier
    );
  }
  
  // Increment counter for this attempt
  incrementCounter(key);
}

/**
 * Reset rate limit for a specific identifier and email type
 * 
 * Useful for testing or manual intervention.
 * 
 * @param identifier - Email address or user ID
 * @param emailType - Type of email
 */
export function resetRateLimit(identifier: string, emailType: EmailType): void {
  const key = generateRateLimitKey(identifier, emailType);
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits
 * 
 * Useful for testing or system maintenance.
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get rate limit status for an identifier
 * 
 * Returns current rate limit information without modifying counters.
 * Useful for displaying rate limit status to users.
 * 
 * @param identifier - Email address or user ID
 * @param emailType - Type of email
 * @returns Rate limit status or null if no limit is active
 */
export function getRateLimitStatus(
  identifier: string,
  emailType: EmailType
): {
  attemptsRemaining: number;
  resetsAt: Date;
  isLimited: boolean;
} | null {
  const config = RATE_LIMITS[emailType];
  const key = generateRateLimitKey(identifier, emailType);
  const entry = rateLimitStore.get(key);
  
  // No entry or expired window
  if (!entry || isWindowExpired(entry)) {
    return {
      attemptsRemaining: config.maxAttempts,
      resetsAt: new Date(Date.now() + config.windowDuration),
      isLimited: false,
    };
  }
  
  const attemptsRemaining = Math.max(0, entry.maxAttempts - entry.count);
  const resetsAt = calculateRetryAfter(entry);
  const isLimited = entry.count >= entry.maxAttempts;
  
  return {
    attemptsRemaining,
    resetsAt,
    isLimited,
  };
}

/**
 * Clean up expired rate limit entries
 * 
 * Should be called periodically to prevent memory leaks.
 * In production with Redis, this would be handled by TTL.
 */
export function cleanupExpiredEntries(): void {
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((entry, key) => {
    if (isWindowExpired(entry)) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
  
  if (keysToDelete.length > 0) {
    console.log(`[RATE LIMITER] Cleaned up ${keysToDelete.length} expired entries`);
  }
}

// Set up periodic cleanup (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}
