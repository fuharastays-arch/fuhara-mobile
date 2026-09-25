'use client';
import { createBrowserClient } from '@supabase/ssr';
import { publicEnv, authCookieOptions } from '@/lib/env';
export function browserClient() {
  const env = publicEnv();
  if (!env) throw new Error('Authentication is not configured.');
  return createBrowserClient(env.url, env.key, {
    cookieOptions: authCookieOptions(),
  });
}
