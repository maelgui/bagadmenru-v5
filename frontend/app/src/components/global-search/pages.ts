import {
  type LucideIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CalendarPlusIcon,
  CalendarRangeIcon,
  FolderIcon,
  HouseIcon,
  LayoutListIcon,
  TrophyIcon,
  UserIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';
import type { SectionNavItem } from '../section-nav';
import { ADMIN_BASE, ADMIN_SECTIONS } from '../../pages/admin/sections';
import { SETTINGS_BASE, SETTINGS_SECTIONS } from '../../pages/profiles/settings/sections';

export interface SearchablePage {
  label: string;
  to: string;
  icon: LucideIcon;
  section?: string;
  keywords?: string[];
  permission?: [action: string, resource: string];
}

export const PAGE_RESULTS_LIMIT = 5;

// Extra search words for section pages, keyed by route. The sections
// themselves (label, path, icon) are owned by their layout.
const SECTION_KEYWORDS: Record<string, string[]> = {
  '/profile/settings/profile': ['photo', 'nom'],
  '/profile/settings/account': ['email', 'déconnexion'],
  '/profile/settings/appearance': ['thème', 'sombre', 'clair'],
  '/profile/settings/membership': ['cotisation', 'helloasso'],
  '/profile/settings/security': ['passkey', 'mot de passe', 'sessions'],
  '/profile/settings/api': ['clé', 'ics', 'calendrier'],
  '/profile/settings/notifications': ['push', 'email'],
  '/admin/groups': ['pupitres'],
  '/admin/members': ['comptes'],
  '/admin/memberships': ['helloasso'],
  '/admin/communication': ['mailing', 'listes'],
  '/admin/security': ['passkeys', 'sessions'],
  '/admin/system': ['statut', 'intégrations'],
};

function sectionPages(
  base: string,
  items: SectionNavItem[],
  section: string,
  permission?: [action: string, resource: string],
): SearchablePage[] {
  return items.map((item) => {
    const to = `${base}/${item.to}`;
    return {
      label: item.label, to, icon: item.icon, section, keywords: SECTION_KEYWORDS[to], permission,
    };
  });
}

export const SEARCHABLE_PAGES: SearchablePage[] = [
  { label: 'Accueil', to: '/', icon: HouseIcon, keywords: ['home', 'degemer mat'] },
  { label: 'Doodle', to: '/events/?noRedirect=true', icon: CalendarIcon, section: 'Évènements', keywords: ['présences', 'tableau'], permission: ['create', 'response'] },
  { label: 'Planning', to: '/events/planning', icon: CalendarRangeIcon, section: 'Évènements', keywords: ['présences'], permission: ['create', 'response'] },
  { label: 'Calendrier', to: '/events/calendar', icon: CalendarDaysIcon, section: 'Évènements', keywords: ['mois', 'agenda'], permission: ['view', 'event'] },
  { label: 'Gestion des évènements', to: '/events/manage', icon: LayoutListIcon, section: 'Évènements', keywords: ['gérer'], permission: ['edit', 'event'] },
  { label: 'Ajouter un évènement', to: '/events/add', icon: CalendarPlusIcon, section: 'Évènements', keywords: ['nouveau', 'créer'], permission: ['create', 'event'] },
  { label: 'Désinscriptions', to: '/events/desinscriptions', icon: UserMinusIcon, section: 'Évènements', keywords: ['absent', 'historique'], permission: ['view', 'response_history'] },
  { label: 'Fichiers', to: '/files', icon: FolderIcon, keywords: ['partitions', 'documents', 'dossiers'], permission: ['view', 'file'] },
  { label: 'Trombinoscope', to: '/profile', icon: UsersIcon, keywords: ['membres', 'liste', 'annuaire'], permission: ['view', 'profile'] },
  { label: 'Classements', to: '/profile/rankings', icon: TrophyIcon, keywords: ['réactivité', 'engagement'], permission: ['view', 'response'] },
  { label: 'Inviter un membre', to: '/profile/invite', icon: UserPlusIcon, keywords: ['invitation', 'parrainage', 'qr'], permission: ['create', 'invitation'] },
  { label: 'Rapprochement des adhésions', to: '/profile/membership/reconciliation', icon: WalletIcon, keywords: ['helloasso', 'cotisation'], permission: ['edit', 'membership'] },
  { label: 'Mon profil', to: '/profile/me', icon: UserIcon, keywords: ['moi'] },
  ...sectionPages(SETTINGS_BASE, SETTINGS_SECTIONS, 'Paramètres'),
  ...sectionPages(ADMIN_BASE, ADMIN_SECTIONS, 'Administration', ['view', 'admin']),
];

export function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function tokens(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

export function pageTitle(page: SearchablePage): string {
  return page.section ? `${page.section} · ${page.label}` : page.label;
}

export function matchPages(
  query: string,
  can: (action: string, resource: string) => boolean,
  limit = PAGE_RESULTS_LIMIT,
): SearchablePage[] {
  const words = tokens(query);
  if (words.length === 0) return [];
  return SEARCHABLE_PAGES
    .filter((page) => !page.permission || can(...page.permission))
    .map((page) => {
      const haystack = normalize([page.label, page.section ?? '', ...(page.keywords ?? [])].join(' '));
      if (!words.every((word) => haystack.includes(word))) return null;
      return { page, rank: normalize(page.label).startsWith(words[0]) ? 0 : 1 };
    })
    .filter((hit): hit is { page: SearchablePage; rank: number } => hit !== null)
    .sort((first, second) => first.rank - second.rank)
    .slice(0, limit)
    .map((hit) => hit.page);
}
