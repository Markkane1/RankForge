import { redisConnection } from '@rankforge/queue';

// ─── Redis sliding-window rate limiter ───

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfter: number | null; // seconds until the window resets (null when success=true)
}

/**
 * Generic Redis-backed sliding-window rate limiter.
 *
 * Uses INCR + EXPIRE pattern:
 *   - First request in window: INCR sets key to 1, EXPIRE sets TTL.
 *   - Subsequent: INCR increments. If > limit, reject.
 *
 * @param key    — Redis key prefix (e.g. `rl:login:1.2.3.4:user@example.com`)
 * @param limit  — Max requests allowed in the window
 * @param windowSec — Window duration in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const fullKey = `ratelimit:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;

  const count = await redisConnection.incr(fullKey);

  // Set expiry on first hit in this window
  if (count === 1) {
    await redisConnection.expire(fullKey, windowSec);
  }

  if (count > limit) {
    // Calculate retryAfter from the key's remaining TTL
    const ttl = await redisConnection.ttl(fullKey);
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.max(1, ttl),
    };
  }

  return {
    success: true,
    remaining: limit - count,
    retryAfter: null,
  };
}

// ─── Account lockout after repeated failures ───

/**
 * Check if an account is locked out due to too many failed attempts.
 * Returns the remaining TTL if locked, null if not.
 */
export async function getLockout(key: string): Promise<number | null> {
  const ttl = await redisConnection.ttl(`lockout:${key}`);
  return ttl > 0 ? ttl : null;
}

/**
 * Record a failed attempt. After `maxAttempts` failures, sets a lockout.
 * Returns the new failure count and whether a lockout was triggered.
 */
export async function recordFailure(
  key: string,
  maxAttempts: number,
  lockoutSec: number,
): Promise<{ count: number; locked: boolean }> {
  const fullKey = `failures:${key}`;

  const count = await redisConnection.incr(fullKey);
  if (count === 1) {
    await redisConnection.expire(fullKey, lockoutSec);
  }

  if (count >= maxAttempts) {
    // Set lockout that lasts the full window
    await redisConnection.set(`lockout:${key}`, '1', 'EX', lockoutSec);
    return { count, locked: true };
  }

  return { count, locked: false };
}

/**
 * Clear failure counters on successful authentication.
 */
export async function clearFailures(key: string): Promise<void> {
  await redisConnection.del(`failures:${key}`, `lockout:${key}`);
}

// ─── Pre-built throttle configs ───

/** Login: 5 attempts per 15 minutes per IP+email combo */
export async function rateLimitLogin(ip: string, email: string): Promise<RateLimitResult> {
  return rateLimit(`login:${ip}:${email}`, 5, 15 * 60);
}

/** 2FA setup/verify/disable: 10 attempts per 5 minutes per user */
export async function rateLimit2fa(userId: string): Promise<RateLimitResult> {
  return rateLimit(`2fa:${userId}`, 10, 5 * 60);
}

/** Generic sensitive mutation: 20 per minute per IP */
export async function rateLimitSensitive(ip: string, action: string): Promise<RateLimitResult> {
  return rateLimit(`sensitive:${action}:${ip}`, 20, 60);
}

/** Webhook ingestion: 100 per minute per IP */
export async function rateLimitWebhook(ip: string, provider: string): Promise<RateLimitResult> {
  return rateLimit(`webhook:${provider}:${ip}`, 100, 60);
}
