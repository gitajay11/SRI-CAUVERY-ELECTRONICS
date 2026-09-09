import { assignableRoles } from '@tamizh/core/permissions';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getRoleMatrix, listStaff } from '@/services/staff';
import { PageHeader, Panel } from '@/components/ui/Primitives';
import { StaffManager } from '@/components/staff/StaffManager';
import { RoleMatrix } from '@/components/staff/RoleMatrix';

export const metadata = { title: 'Staff' };

export default async function StaffPage() {
  const identity = await requirePermission('staff.view');
  const { t, locale } = await getI18n();

  const canManageRoles = identity.permissions.has('roles.manage');
  const [staff, matrix] = await Promise.all([
    listStaff(),
    canManageRoles ? getRoleMatrix() : Promise.resolve({}),
  ]);

  return (
    <>
      <PageHeader title={t('staff.title')} description={t('staff.activeHint')} />

      <div className="space-y-5">
        <StaffManager
          staff={staff}
          assignable={assignableRoles(identity.role)}
          currentUserId={identity.id}
          locale={locale}
        />

        {canManageRoles ? (
          <Panel title={t('staff.roles')} description={t('staff.rolesHint')}>
            <RoleMatrix matrix={matrix} locale={locale} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
