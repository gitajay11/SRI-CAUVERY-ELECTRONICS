import { NextResponse } from 'next/server';
import { getPrisma } from '@tamizh/db';

/**
 * GET /api/health — is the shop up, and is its database answering?
 *
 * One trivial query, so that a monitor pinging this every few minutes keeps
 * both the function and the database compute warm: Neon puts the database
 * to sleep after a few idle minutes, and the first shopper after that wait
 * would otherwise pay a second or two to wake it. Nothing about the shop is
 * revealed beyond "yes" and how long the database took.
 */
export async function GET(): Promise<NextResponse> {
  const started = Date.now();
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return NextResponse.json(
      { ok: true, dbMs: Date.now() - started },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
