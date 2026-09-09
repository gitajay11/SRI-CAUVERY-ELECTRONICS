import { NextResponse } from 'next/server';
import { handleRouteError, ok } from '@tamizh/core/api';
import { requireUser } from '@/lib/auth';
import { getRepository } from '@/services/repository';

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };

/** DELETE /api/account/addresses/[id] — remove one saved address. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await params;
    await getRepository().deleteAddress(user.id, id);
    return ok({ deleted: true }, noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** PATCH /api/account/addresses/[id] — make this the default address. */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await params;
    await getRepository().setDefaultAddress(user.id, id);
    const addresses = await getRepository().listAddresses(user.id);
    return ok({ addresses }, noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}
