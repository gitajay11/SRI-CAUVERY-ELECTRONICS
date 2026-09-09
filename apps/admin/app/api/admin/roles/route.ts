import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { ALL_PERMISSIONS } from '@tamizh/core/permissions';
import { requirePermission } from '@/lib/session';
import { setRolePermissions } from '@/services/staff';

const schema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'INVENTORY_MANAGER', 'ORDER_MANAGER', 'SUPPORT_STAFF']),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).max(200),
});

/** PUT /api/admin/roles — rewrite what one role may do. */
export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const identity = await requirePermission('roles.manage');
    const { role, permissions } = schema.parse(await readJson(request));
    return ok(await setRolePermissions(identity, role, permissions as never));
  } catch (error) {
    return handleRouteError(error);
  }
}
