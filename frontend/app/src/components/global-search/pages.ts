import {
  CalendarPlusIcon,
  LayoutListIcon,
  TrophyIcon,
  UserIcon,
  UserPlusIcon,
  WalletIcon,
} from 'lucide-react';
import {
  type AppPage, type Can, FILES_PAGE, HOME_PAGE, isAllowed, MEMBERS_PAGE, type Permission,
} from '../../config/navigation';
import type { SectionNavItem } from '../section-nav';
import { ADMIN_BASE, ADMIN_SECTIONS } from '../../pages/admin/sections';
import { EVENT_VIEWS, RESPONSE_HISTORY_PAGE } from '../../pages/events/sections';
import { SETTINGS_BASE, SETTINGS_SECTIONS } from '../../pages/profiles/settings/sections';

export interface SearchablePage extends AppPage {
  // Area the page belongs to, shown as a prefix ("Paramètres · Sécurité").
  section?: string;
}

export const PAGE_RESULTS_LIMIT = 5;

function inSection(section: string, pages: AppPage[]): SearchablePage[] {
  return pages.map((page) => ({ ...page, section }));
}

function sectionPages(base: string, items: SectionNavItem[], section: string, permission?: Permission): SearchablePage[] {
  return items.map((item) => ({
    label: item.label, to: `${base}/${item.to}`, icon: item.icon, keywords: item.keywords, permission, section,
  }));
}

export const SEARCHABLE_PAGES: SearchablePage[] = [
  HOME_PAGE,
  ...inSection('Évènements', [
    ...EVENT_VIEWS,
    { label: 'Gestion des évènements', to: '/events/manage', icon: LayoutListIcon, keywords: ['gérer'], permission: ['edit', 'event'] },
    { label: 'Ajouter un évènement', to: '/events/add', icon: CalendarPlusIcon, keywords: ['nouveau', 'créer'], permission: ['create', 'event'] },
    RESPONSE_HISTORY_PAGE,
  ]),
  FILES_PAGE,
  MEMBERS_PAGE,
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

export function matchPages(query: string, can: Can, limit = PAGE_RESULTS_LIMIT): SearchablePage[] {
  const words = tokens(query);
  if (words.length === 0) return [];
  return SEARCHABLE_PAGES
    .filter((page) => isAllowed(page, can))
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
