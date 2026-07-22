import { redisConnection } from '@rankforge/queue';

// ─── Redis sliding-window rate limiter ───

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfter: number | null; // seconds until the window resets (null when success=true)
}

/**
 * Helper to wrap a promise with a timeout. If the promise does not resolve within
 * ms, it resolves to the fallback value.
 */
async function withTimeout<T>(promise: Promise<T> | T, fallback: T, ms = 1000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * Generic Redis-backed sliding-window rate limiter.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const fullKey = `ratelimit:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;

  try {
    const count = await withTimeout(redisConnection.incr(fullKey), 1);

    // Set expiry on first hit in this window
    if (count === 1) {
      await withTimeout(redisConnection.expire(fullKey, windowSec), true);
    }

    if (count > limit) {
      // Calculate retryAfter from the key's remaining TTL
      const ttl = await withTimeout(redisConnection.ttl(fullKey), windowSec);
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
  } catch (err) {
    console.error('Rate limiter Redis error, falling back to allow:', err);
    return {
      success: true,
      remaining: limit,
      retryAfter: null,
    };
  }
}

// ─── Account lockout after repeated failures ───

/**
 * Check if an account is locked out due to too many failed attempts.
 * Returns the remaining TTL if locked, null if not.
 */
export async function getLockout(key: string): Promise<number | null> {
  try {
    const ttl = await withTimeout(redisConnection.ttl(`lockout:${key}`), -1);
    return ttl > 0 ? ttl : null;
  } catch (err) {
    console.error('Lockout check Redis error:', err);
    return null;
  }
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

  try {
    const count = await withTimeout(redisConnection.incr(fullKey), 1);
    if (count === 1) {
      await withTimeout(redisConnection.expire(fullKey, lockoutSec), true);
    }

    if (count >= maxAttempts) {
      // Set lockout that lasts the full window
      await withTimeout(redisConnection.set(`lockout:${key}`, '1', 'EX', lockoutSec), 'OK');
      return { count, locked: true };
    }

    return { count, locked: false };
  } catch (err) {
    console.error('Record failure Redis error:', err);
    return { count: 1, locked: false };
  }
}

/**
 * Clear failure counters on successful authentication.
 */
export async function clearFailures(key: string): Promise<void> {
  try {
    await withTimeout(redisConnection.del(`failures:${key}`, `lockout:${key}`), 0);
  } catch (err) {
    console.error('Clear failures Redis error:', err);
  }
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
