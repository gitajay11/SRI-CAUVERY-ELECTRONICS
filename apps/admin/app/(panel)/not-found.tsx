import { getI18n } from '@/i18n/server';
import { EmptyState } from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { SearchIcon } from '@/components/ui/Icons';

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <EmptyState
      icon={<SearchIcon />}
      title={t('error.notFound')}
      body={t('error.notFoundBody')}
      action={<ButtonLink href="/">{t('nav.dashboard')}</ButtonLink>}
      className="rounded-panel border border-slate-200 bg-surface"
    />
  );
}
