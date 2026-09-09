import { NextResponse } from 'next/server';
import { handleRouteError, fail } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { recordAudit } from '@/lib/audit';
import { resolveRange, type RangeKey } from '@/services/dashboard';
import { inventoryCsv, ordersCsv, productsCsv, salesCsv } from '@/services/reports';

/**
 * GET /api/admin/reports/export?report=…&range=…
 *
 * Streams a CSV. Every export is written to the audit log with what was taken
 * and by whom — an export is the one action that removes data from the panel's
 * own boundaries, so it should never be silent.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const identity = await requirePermission('reports.export');
    const params = new URL(request.url).searchParams;

    const report = params.get('report') ?? 'orders';
    const range = resolveRange(
      (params.get('range') as RangeKey) ?? 'last30',
      params.get('from') ?? undefined,
      params.get('to') ?? undefined,
    );

    const builders: Record<string, () => Promise<string>> = {
      orders: () => ordersCsv(range),
      sales: () => salesCsv(range),
      products: () => productsCsv(range),
      inventory: () => inventoryCsv(),
    };

    const build = builders[report];
    if (!build) return fail('Unknown report.', 422, { code: 'unknown_report' });

    const csv = await build();

    await recordAudit(identity, {
      action: 'report.exported',
      entityType: 'Report',
      entityId: report,
      summary: `Exported the ${report} report (${range.from.toISOString().slice(0, 10)} to ${range.to.toISOString().slice(0, 10)})`,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tamizh-${report}-${stamp}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
