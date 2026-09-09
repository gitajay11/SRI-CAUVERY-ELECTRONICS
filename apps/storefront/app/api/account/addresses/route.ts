import { NextResponse } from 'next/server';
import { created, handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requireUser } from '@/lib/auth';
import { addressSchema } from '@/lib/validation';
import { getRepository } from '@/services/repository';

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };

/** GET /api/account/addresses — the shopper's address book. */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const addresses = await getRepository().listAddresses(user.id);
    return ok({ addresses }, noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/account/addresses — save a new delivery address. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const body = addressSchema.parse(await readJson(request));
    const address = await getRepository().createAddress(user.id, body);
    return created({ address });
  } catch (error) {
    return handleRouteError(error);
  }
}
