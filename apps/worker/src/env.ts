const required = ['TWO_FACTOR_ENCRYPTION_KEY'];

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function validateWorkerEnv() {
  const missing = required.filter((name) => !process.env[name]);
  if (!missing.length) return;

  const message = `Missing worker environment variables: ${missing.join(', ')}`;
  if (process.env.NODE_ENV === 'production') throw new Error(message);
  console.warn(message);
}
