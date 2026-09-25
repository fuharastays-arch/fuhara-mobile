import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
import { safeNext } from '@fuhara/core';
import { appOrigin, publicEnv } from '@/lib/env';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const desired = request.nextUrl.searchParams.get('next');
  const next = desired === '/auth/reset-password' ? desired : safeNext(desired);
  if (code && publicEnv()) {
    const client = await serverClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, appOrigin()));
  }
  return NextResponse.redirect(
    new URL('/auth/sign-in?error=callback', appOrigin()),
  );
}
