/**
 * Fails fast with a clear, actionable message instead of letting a missing
 * environment variable surface as a cryptic error deep inside a third-party
 * client (e.g. Supabase throwing on an `undefined` URL).
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env.local (see .env.example) or your deployment platform's environment settings.`
    );
  }
  return value;
}
