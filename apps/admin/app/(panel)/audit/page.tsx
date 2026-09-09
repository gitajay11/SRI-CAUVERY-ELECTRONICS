import Link from 'next/link';
import { db } from '@tamizh/db';
import { formatDate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { PageHeader, Panel, Badge, EmptyState } from '@/components/ui/Primitives';
import { Pagination } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/filters/FilterBar';
import { HistoryIcon } from '@/components/ui/Icons';
import { buildQuery, first, readPage, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Audit log' };

const PAGE_SIZE = 50;

/** Actions that move money or change who can do what. */
const SENSITIVE = /^(refund|staff|role|settings|auth|report|customer)\./;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission('audit.view');
  const { t, dict } = await getI18n();
  const params = await searchParams;

  const page = readPage(params.page);
  const actorId = first(params.actor);
  const area = first(params.area);
  const query = first(params.q);

  const and: Record<string, unknown>[] = [];
  if (actorId) and.push({ actorId });
  if (area) and.push({ action: { startsWith: `${area}.` } });
  if (query) {
    and.push({
      OR: [
        { summary: { contains: query, mode: 'insensitive' } },
        { entityId: { contains: query } },
        { action: { contains: query } },
      ],
    });
  }
  const where = (and.length > 0 ? { AND: and } : {}) as never;

  const [total, entries, actors] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        summary: true,
        changes: true,
        ip: true,
        createdAt: true,
        actor: { select: { id: true, name: true } },
      },
    }),
    db.adminUser.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={t('audit.title')}
        description={t('audit.subtitle')}
      />

      <FilterBar
        basePath="/audit"
        params={params}
        searchPlaceholder={t('audit.searchPlaceholder')}
        selects={[
          {
            name: 'actor',
            label: t('audit.actor'),
            value: actorId ?? '',
            options: [
              { value: '', label: t('common.viewAll') },
              ...actors.map((actor) => ({ value: actor.id, label: actor.name })),
            ],
          },
          {
            name: 'area',
            label: t('audit.area'),
            value: area ?? '',
            options: [
              { value: '', label: t('common.viewAll') },
              { value: 'product', label: dict['products.title'] },
              { value: 'inventory', label: dict['inventory.title'] },
              { value: 'order', label: dict['orders.title'] },
              { value: 'refund', label: dict['refunds.title'] },
              { value: 'return', label: dict['returns.title'] },
              { value: 'coupon', label: dict['coupons.title'] },
              { value: 'customer', label: dict['customers.title'] },
              { value: 'staff', label: dict['staff.title'] },
              { value: 'settings', label: dict['settings.title'] },
              { value: 'auth', label: dict['audit.signIn'] },
            ],
          },
        ]}
      />

      <Panel padded={false} className="mt-4">
        {entries.length === 0 ? (
          <EmptyState icon={<HistoryIcon />} title={t('audit.empty')} />
        ) : (
          <ol className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const changes =
                entry.changes && typeof entry.changes === 'object'
                  ? (entry.changes as Record<string, { from?: unknown; to?: unknown }>)
                  : null;

              return (
                <li key={entry.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium text-slate-900">{entry.summary}</span>
                    {SENSITIVE.test(entry.action) ? (
                      <Badge tone="caution">{entry.action}</Badge>
                    ) : (
                      <Badge tone="neutral">{entry.action}</Badge>
                    )}
                  </div>

                  {changes && Object.keys(changes).length > 0 ? (
                    <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                      {Object.entries(changes).map(([field, change]) => (
                        <div key={field} className="flex gap-1">
                          <dt className="font-medium">{field}:</dt>
                          <dd>
                            <span className="line-through">{String(change?.from ?? '—')}</span>
                            <span aria-hidden="true"> → </span>
                            <span className="text-slate-700">{String(change?.to ?? '—')}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  <p className="mt-0.5 text-xs text-slate-400">
                    {entry.actor ? (
                      <Link
                        href={buildQuery('/audit', params, { actor: entry.actor.id, page: 1 })}
                        className="hover:text-link hover:underline"
                      >
                        {entry.actor.name}
                      </Link>
                    ) : (
                      t('audit.system')
                    )}
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    {formatDate(entry.createdAt, true)}
                    {entry.ip ? (
                      <>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono">{entry.ip}</span>
                      </>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ol>
        )}

        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          buildHref={(target) => buildQuery('/audit', params, { page: target })}
          labels={{
            previous: t('common.previous'),
            next: t('common.next'),
            showing: dict['common.showing'],
            page: dict['common.page'],
          }}
        />
      </Panel>

      <p className="mt-3 text-xs text-slate-400">{t('audit.retention')}</p>
    </>
  );
}
