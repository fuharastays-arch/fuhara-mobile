import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv, authCookieOptions } from '@/lib/env';
export async function serverClient() {
  const env = publicEnv();
  if (!env) throw new Error('Authentication is not configured.');
  const jar = await cookies();
  return createServerClient(env.url, env.key, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Server components are read-only; proxy refreshes cookies. */
        }
      },
    },
  });
}
