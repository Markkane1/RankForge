const required = [
  'ENCRYPTION_KEY',
  'FRONTEND_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
];

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function validateApiEnv() {
  const missing = required.filter((name) => !process.env[name]);
  if (!missing.length) return;

  const message = `Missing API environment variables: ${missing.join(', ')}`;
  if (process.env.NODE_ENV === 'production') throw new Error(message);
  console.warn(message);
}
