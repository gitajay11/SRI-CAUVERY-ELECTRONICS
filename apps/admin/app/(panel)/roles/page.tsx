import Link from 'next/link';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getRoleMatrix } from '@/services/staff';
import { PageHeader, Panel } from '@/components/ui/Primitives';
import { RoleMatrix } from '@/components/staff/RoleMatrix';

export const metadata = { title: 'Roles' };

export default async function RolesPage() {
  await requirePermission('roles.manage');
  const { t, locale } = await getI18n();

  const matrix = await getRoleMatrix();

  return (
    <>
      <PageHeader
        title={t('roles.title')}
        description={t('roles.subtitle')}
        action={
          <Link href="/staff" className="text-sm font-medium text-brand-700 hover:underline">
            {t('staff.title')} →
          </Link>
        }
      />

      <Panel>
        <RoleMatrix matrix={matrix} locale={locale} />
      </Panel>

      <p className="mt-3 text-xs text-slate-400">{t('roles.ownerNote')}</p>
    </>
  );
}
