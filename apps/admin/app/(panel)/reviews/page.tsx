import type { ReviewStatus } from '@tamizh/db/enums';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listReviews } from '@/services/reviews';
import { PageHeader, Panel, EmptyState, Badge } from '@/components/ui/Primitives';
import { Pagination } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/filters/FilterBar';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { StarIcon } from '@/components/ui/Icons';
import { buildQuery, first, readPage, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Reviews' };

const PAGE_SIZE = 20;

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const identity = await requirePermission('reviews.view');
  const { t, dict } = await getI18n();
  const params = await searchParams;

  const page = readPage(params.page);
  const status = (first(params.status) as ReviewStatus | undefined) ?? 'ALL';
  const ratingParam = first(params.rating);
  const rating = ratingParam ? Number(ratingParam) : undefined;

  const { rows, total, pending } = await listReviews({
    q: first(params.q),
    status,
    rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const canModerate = identity.permissions.has('reviews.moderate');

  return (
    <>
      <PageHeader
        title={t('reviews.title')}
        description={t('common.showing', {
          from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
          to: Math.min(page * PAGE_SIZE, total),
          total,
        })}
        action={
          pending > 0 ? (
            <Badge tone="caution">
              {pending} {t('reviews.pendingOnly')}
            </Badge>
          ) : null
        }
      />

      <FilterBar
        basePath="/reviews"
        params={params}
        searchPlaceholder={t('common.search')}
        selects={[
          {
            name: 'status',
            label: t('common.status'),
            value: status === 'ALL' ? '' : status,
            options: [
              { value: '', label: t('common.viewAll') },
              { value: 'PENDING', label: dict['reviews.status.PENDING'] },
              { value: 'APPROVED', label: dict['reviews.status.APPROVED'] },
              { value: 'HIDDEN', label: dict['reviews.status.HIDDEN'] },
            ],
          },
          {
            name: 'rating',
            label: t('common.filter'),
            value: rating ? String(rating) : '',
            options: [
              { value: '', label: t('common.viewAll') },
              { value: '5', label: '★★★★★' },
              { value: '4', label: '★★★★' },
              { value: '3', label: '★★★' },
              { value: '2', label: '★★' },
              { value: '1', label: '★' },
            ],
          },
        ]}
      />

      <Panel padded={false} className="mt-4">
        {rows.length === 0 ? (
          <EmptyState icon={<StarIcon />} title={t('reviews.empty')} />
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                canModerate={canModerate}
                canSeeCustomer={identity.permissions.has('customers.view')}
              />
            ))}
          </div>
        )}
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          buildHref={(target) => buildQuery('/reviews', params, { page: target })}
          labels={{
            previous: t('common.previous'),
            next: t('common.next'),
            showing: dict['common.showing'],
            page: dict['common.page'],
          }}
        />
      </Panel>
    </>
  );
}
