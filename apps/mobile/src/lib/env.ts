const STAGING_REF = 'xhneambzjwqqwhtcnytq';
const expectedHost = `${STAGING_REF}.supabase.co`;

function required(value: string | undefined, name: string) {
  const clean = value?.trim();
  if (!clean)
    throw new Error(`${name} is missing. Copy .env.example to .env.local.`);
  return clean;
}

export function readPublicEnvironment(
  input = {
    appEnv: process.env.EXPO_PUBLIC_APP_ENV,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  },
) {
  if (input.appEnv !== 'staging') {
    throw new Error(
      'This alpha is locked to STAGING. EXPO_PUBLIC_APP_ENV must be staging.',
    );
  }
  const supabaseUrl = new URL(
    required(input.supabaseUrl, 'EXPO_PUBLIC_SUPABASE_URL'),
  );
  if (
    supabaseUrl.protocol !== 'https:' ||
    supabaseUrl.hostname !== expectedHost
  ) {
    throw new Error(
      `This build only accepts Supabase STAGING ref ${STAGING_REF}.`,
    );
  }
  const publishableKey = required(
    input.publishableKey,
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  );
  if (
    publishableKey.startsWith('sb_secret_') ||
    publishableKey.includes('service_role')
  ) {
    throw new Error(
      'A server secret or service-role key must never be bundled in the app.',
    );
  }
  return {
    appEnv: 'staging' as const,
    supabaseUrl: supabaseUrl.origin,
    publishableKey,
    easProjectId: input.easProjectId?.trim() || null,
    supabaseProjectRef: STAGING_REF,
  };
}

export const publicEnvironment = readPublicEnvironment();
