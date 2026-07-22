import { z } from 'zod';

/**
 * Environment variable schema — validated once at module-load time.
 * Required vars fail-fast in production; dev gets lenient defaults so
 * local hacking doesn't require a full .env file.
 */
const envSchema = z.object({
  // ─── Database ───
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),

  // ─── NextAuth ───
  NEXTAUTH_URL: z.string().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required — generate with `openssl rand -base64 32`'),

  // ─── 2FA secret encryption ───
  // Must be exactly 32 bytes (base64-encoded = 44 chars). Generate: `openssl rand -base64 32`
  TWO_FACTOR_ENCRYPTION_KEY: z.string().min(1, 'TWO_FACTOR_ENCRYPTION_KEY is required — generate with `openssl rand -base64 32`'),

  // ─── Redis ───
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  // ─── Webhooks ───
  GOOGLE_WEBHOOK_SECRET: z.string().min(1, 'GOOGLE_WEBHOOK_SECRET is required for webhook signature verification'),
  GOOGLE_WEBHOOK_VERIFY_TOKEN: z.string().default('rankforge-google-webhook-verify'),

  // ─── Frontend API ───
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:3001'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
});

const isProduction = process.env.NODE_ENV === 'production';

function parseEnv() {
  const raw = { ...process.env };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    if (isProduction) {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }
    // In dev, warn but continue — allows local hacking without a full .env
    console.warn(`[env] Missing env vars (dev mode — using defaults where possible):\n${errors.join('\n')}`);
  }

  // In dev, fill missing values with parsed defaults so the app still boots
  return result.success ? result.data : envSchema.parse(raw);
}

export const env = parseEnv();
