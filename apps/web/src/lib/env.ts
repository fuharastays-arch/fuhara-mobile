export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return null;
  if (!url || !key)
    throw new Error('Set both public Supabase environment values.');
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(parsed.hostname)
  )
    throw new Error('Supabase requires HTTPS.');
  if (key.startsWith('sb_secret_'))
    throw new Error('Secret Supabase keys are forbidden in the product app.');
  if (!key.startsWith('sb_publishable_')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1]));
      if (payload.role !== 'anon') throw new Error();
    } catch {
      throw new Error('Use a Supabase publishable or legacy anon key.');
    }
  }
  return { url, key };
}
export function appOrigin() {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw)
    throw new Error('NEXT_PUBLIC_APP_URL is required for email redirects.');
  const url = new URL(raw);
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('APP_URL must be an origin.');
  if (
    url.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(url.hostname)
  )
    throw new Error('APP_URL requires HTTPS.');
  return url.origin;
}

export function authCookieOptions() {
  return {
    name: 'fuhara-product-auth',
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ?? false,
  };
}
