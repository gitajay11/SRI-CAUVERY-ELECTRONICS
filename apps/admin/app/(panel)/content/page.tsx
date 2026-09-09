import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listBanners } from '@/services/settings';
import { storefrontUrl } from '@/lib/env';
import { PageHeader } from '@/components/ui/Primitives';
import { BannerManager } from '@/components/content/BannerManager';

export const metadata = { title: 'Content' };

export default async function ContentPage() {
  await requirePermission('content.manage');
  const { t } = await getI18n();

  const banners = await listBanners();

  return (
    <>
      <PageHeader title={t('content.title')} description={t('content.subtitle')} />

      <BannerManager
        storefrontUrl={storefrontUrl()}
        banners={banners.map((banner) => ({
          id: banner.id,
          placement: banner.placement,
          title: banner.title,
          titleTa: banner.titleTa ?? '',
          subtitle: banner.subtitle ?? '',
          subtitleTa: banner.subtitleTa ?? '',
          imageUrl: banner.imageUrl ?? '',
          ctaLabel: banner.ctaLabel ?? '',
          ctaLabelTa: banner.ctaLabelTa ?? '',
          ctaHref: banner.ctaHref ?? '',
          isActive: banner.isActive,
          sortOrder: banner.sortOrder,
          startsAt: banner.startsAt ? banner.startsAt.toISOString().slice(0, 10) : '',
          endsAt: banner.endsAt ? banner.endsAt.toISOString().slice(0, 10) : '',
        }))}
      />
    </>
  );
}
