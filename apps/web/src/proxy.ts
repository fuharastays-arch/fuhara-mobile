import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv, authCookieOptions } from '@/lib/env';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = publicEnv();
  if (!env) return response;
  const client = createServerClient(env.url, env.key, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  await client.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {
  matcher: ['/account/:path*', '/host/:path*', '/auth/:path*'],
};
