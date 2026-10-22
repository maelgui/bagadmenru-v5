import type { AdminMember, Group } from 'bagad-client';
import { MembershipStatus } from 'bagad-client';
import type { LucideIcon } from 'lucide-react';
import { LinkIcon, MailWarningIcon, ShieldAlertIcon } from 'lucide-react';
import { hasCredential } from './memberUtils';

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

export interface OverviewAlert {
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
}

/** Everything the landing page shows, derived from the sections' own data. */
export function buildOverview(
  members: AdminMember[],
  groups: Group[],
  unlinkedCount: number,
) {
  const active = members.filter((m) => m.isActive);
  const withoutCredential = active.filter((m) => !hasCredential(m)).length;
  const mailingListErrors = groups.filter((g) => g.mailingListSyncError).length;

  const alerts: OverviewAlert[] = [];
  if (withoutCredential > 0) {
    alerts.push({
      key: 'credentials',
      icon: ShieldAlertIcon,
      title: `${plural(withoutCredential, 'membre')} sans identifiant`,
      description: 'Ni mot de passe ni passkey : ces membres ne peuvent se connecter que par lien e-mail.',
      to: '/admin/security',
    });
  }
  if (unlinkedCount > 0) {
    alerts.push({
      key: 'unlinked',
      icon: LinkIcon,
      title: `${plural(unlinkedCount, 'adhésion')} à rattacher`,
      description: 'Des commandes HelloAsso ne correspondent à aucun membre.',
      to: '/admin/memberships',
    });
  }
  if (mailingListErrors > 0) {
    alerts.push({
      key: 'mailing',
      icon: MailWarningIcon,
      title: `${plural(mailingListErrors, 'mailing list')} en erreur`,
      description: 'La dernière synchronisation a échoué.',
      to: '/admin/communication',
    });
  }

  return {
    alerts,
    membersActive: active.length,
    membersInactive: members.length - active.length,
    membershipsActive: active.filter((m) => m.membershipStatus === MembershipStatus.Active).length,
    pushDevices: active.reduce((n, m) => n + m.pushSubscriptionCount, 0),
    membersWithPush: active.filter((m) => m.pushSubscriptionCount > 0).length,
    apiKeys: members.reduce((n, m) => n + m.apiKeyCount, 0),
  };
}
