import type { AdminMember } from 'bagad-client';
import { MembershipStatus } from 'bagad-client';

export type Filter = 'all' | 'inactive' | 'no-credential' | 'no-membership' | 'no-email';

export const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'inactive', label: 'Inactifs' },
  { value: 'no-credential', label: 'Sans identifiant' },
  { value: 'no-membership', label: 'Adhésion non à jour' },
  { value: 'no-email', label: 'Sans e-mails' },
];

export function isFilter(value: unknown): value is Filter {
  return FILTERS.some((f) => f.value === value);
}

export function hasCredential(member: AdminMember): boolean {
  return member.hasPassword || member.passkeyCount > 0;
}

export function matchesFilter(member: AdminMember, filter: Filter): boolean {
  switch (filter) {
    case 'inactive':
      return !member.isActive;
    case 'no-credential':
      return member.isActive && !hasCredential(member);
    case 'no-membership':
      return member.isActive && member.membershipStatus !== MembershipStatus.Active;
    case 'no-email':
      return member.isActive && !member.receivesEmails;
    default:
      return true;
  }
}

export function matchesSearch(member: AdminMember, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase('fr');
  if (!needle) return true;
  return `${member.firstName} ${member.lastName} ${member.email}`.toLocaleLowerCase('fr').includes(needle);
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  const text = value == null ? '' : String(value);
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function membersToCsv(members: AdminMember[]): string {
  const header = ['Prénom', 'Nom', 'E-mail', 'Pupitre', 'Groupes', 'Actif', 'Reçoit les e-mails', 'Adhésion', 'Saison', 'Mot de passe', 'Passkeys', 'Appareils push', 'Clés API'];
  const rows = members.map((m) => [
    m.firstName,
    m.lastName,
    m.email,
    m.instrument?.name ?? '',
    m.groups.map((g) => g.name).join(', '),
    m.isActive ? 'oui' : 'non',
    m.receivesEmails ? 'oui' : 'non',
    m.membershipStatus,
    m.membershipActiveSeason ?? '',
    m.hasPassword ? 'oui' : 'non',
    m.passkeyCount,
    m.pushSubscriptionCount,
    m.apiKeyCount,
  ]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
}
