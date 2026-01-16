/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse using token bucket algorithm
 * 
 * Features:
 * - In-memory rate limiting (suitable for single-instance deployments)
 * - Configurable limits per endpoint type
 * - Automatic cleanup of expired entries
 * - Rate limit headers in responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimitError } from '../errors/AppError';
import { SECURITY_CONFIG } from '../appwriteConfig';

/**
 * Rate limit bucket for tracking requests
 */
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * In-memory store for rate limits
 * In production, use Redis or similar distributed cache
 */
class RateLimitStore {
  private store = new Map<string, RateLimitBucket>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get or create bucket for identifier
   */
  getBucket(identifier: string, maxTokens: number): RateLimitBucket {
    let bucket = this.store.get(identifier);
    
    if (!bucket) {
      bucket = {
        tokens: maxTokens,
        lastRefill: Date.now(),
      };
      this.store.set(identifier, bucket);
    }
    
    return bucket;
  }

  /**
   * Update bucket in store
   */
  setBucket(identifier: string, bucket: RateLimitBucket): void {
    this.store.set(identifier, bucket);
  }

  /**
   * Remove old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, bucket] of this.store.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all rate limits (useful for testing)
   */
  clear(): void {
    this.store.clear();
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore();

/**
 * Rate limit configuration for different endpoint types
 */
export enum RateLimitType {
  AUTH = 'auth',
  POST_CREATE = 'post_create',
  POST_READ = 'post_read',
  PROFILE_UPDATE = 'profile_update',
  DEFAULT = 'default',
}

/**
 * Get rate limit config for endpoint type
 */
function getRateLimitConfig(type: RateLimitType): { max: number; window: number } {
  const limits = SECURITY_CONFIG.RATE_LIMITS;
  
  switch (type) {
    case RateLimitType.AUTH:
      return { max: limits.AUTH, window: 60 * 1000 }; // per minute
    case RateLimitType.POST_CREATE:
      return { max: limits.POST_CREATE, window: 60 * 1000 };
    case RateLimitType.POST_READ:
      return { max: 100, window: 60 * 1000 }; // 100 reads per minute
    case RateLimitType.PROFILE_UPDATE:
      return { max: limits.FOLLOW, window: 60 * 1000 }; // Reuse FOLLOW limit
    default:
      return { max: 60, window: 60 * 1000 }; // 60 requests per minute default
  }
}

/**
 * Get client identifier for rate limiting
 * Uses IP address or user ID if authenticated
 */
function getClientIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Try to get real IP from headers (for proxied requests)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Token bucket rate limiting algorithm
 */
function checkRateLimit(
  identifier: string,
  maxTokens: number,
  refillRate: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = rateLimitStore.getBucket(identifier, maxTokens);
  
  // Calculate tokens to add based on time elapsed
  const timeSinceLastRefill = now - bucket.lastRefill;
  const tokensToAdd = (timeSinceLastRefill / windowMs) * maxTokens;
  
  // Refill bucket
  bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
  
  // Check if request is allowed
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    rateLimitStore.setBucket(identifier, bucket);
    
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetAt: now + windowMs,
    };
  }
  
  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetAt: now + windowMs,
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimit(type: RateLimitType = RateLimitType.DEFAULT, getUserId?: (request: NextRequest) => Promise<string | undefined>) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const config = getRateLimitConfig(type);
    
    // Get user ID if authentication check is provided
    const userId = getUserId ? await getUserId(request) : undefined;
    
    // Get client identifier
    const identifier = getClientIdentifier(request, userId);
    const rateLimitKey = `${type}:${identifier}`;
    
    // Check rate limit
    const result = checkRateLimit(
      rateLimitKey,
      config.max,
      config.max,
      config.window
    );
    
    // Add rate limit headers to response
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', config.max.toString());
    headers.set('X-RateLimit-Remaining', result.remaining.toString());
    headers.set('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
    
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      headers.set('Retry-After', retryAfter.toString());
      
      throw new RateLimitError(
        'Too many requests. Please try again later.',
        retryAfter
      );
    }
    
    // Allow request to proceed (middleware will merge headers)
    return null;
  };
}

/**
 * Clear all rate limits (for testing)
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
}
