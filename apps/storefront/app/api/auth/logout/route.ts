import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { handleRouteError, ok } from '@tamizh/core/api';

/** POST /api/auth/logout — clears the session cookie. */
export async function POST(): Promise<NextResponse> {
  try {
    await clearSessionCookie();
    return ok({ signedOut: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
