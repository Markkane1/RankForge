import { redisConnection } from './index';
// ponytail: minimal IdempotentWriter using Redis SETNX for atomic locking.
export class IdempotentWriter {
    prefix;
    constructor(prefix = 'idem') {
        this.prefix = prefix;
    }
    /**
     * Attempts to acquire a lock for the given key.
     * @param key deterministic string key
     * @param ttlSeconds how long the lock should exist before expiring (default 24h)
     * @returns true if lock acquired, false if already processed
     */
    async checkAndLock(key, ttlSeconds = 86400) {
        const fullKey = `${this.prefix}:${key}`;
        const acquired = await redisConnection.set(fullKey, '1', 'EX', ttlSeconds, 'NX');
        return acquired === 'OK';
    }
}
// ponytail: basic retry wrapper with exponential backoff.
export async function withRetry(operation, maxRetries = 3, baseDelayMs = 500) {
    let attempt = 0;
    while (true) {
        try {
            return await operation();
        }
        catch (err) {
            attempt++;
            if (attempt >= maxRetries) {
                throw err;
            }
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            await new Promise(res => setTimeout(res, delay));
        }
    }
}
