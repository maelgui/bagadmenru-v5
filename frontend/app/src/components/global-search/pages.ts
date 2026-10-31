import {
  type LucideIcon,
  ActivityIcon,
  BellIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CalendarPlusIcon,
  CalendarRangeIcon,
  FolderIcon,
  HouseIcon,
  KeyIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LayoutListIcon,
  MegaphoneIcon,
  PaletteIcon,
  ShieldCheckIcon,
  ShieldIcon,
  TrophyIcon,
  UserIcon,
  UserMinusIcon,
  UserPlusIcon,
  UserRoundCogIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
} from 'lucide-react';

export interface SearchablePage {
  label: string;
  to: string;
  icon: LucideIcon;
  section?: string;
  keywords?: string[];
  permission?: [action: string, resource: string];
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
  { label: 'Profil', to: '/profile/settings/profile', icon: UserIcon, section: 'Paramètres', keywords: ['photo', 'nom'] },
  { label: 'Compte', to: '/profile/settings/account', icon: UserRoundCogIcon, section: 'Paramètres', keywords: ['email', 'déconnexion'] },
  { label: 'Apparence', to: '/profile/settings/appearance', icon: PaletteIcon, section: 'Paramètres', keywords: ['thème', 'sombre', 'clair'] },
  { label: 'Adhésion', to: '/profile/settings/membership', icon: WalletIcon, section: 'Paramètres', keywords: ['cotisation', 'helloasso'] },
  { label: 'Sécurité', to: '/profile/settings/security', icon: ShieldIcon, section: 'Paramètres', keywords: ['passkey', 'mot de passe', 'sessions'] },
  { label: 'Accès API', to: '/profile/settings/api', icon: KeyIcon, section: 'Paramètres', keywords: ['clé', 'ics', 'calendrier'] },
  { label: 'Notifications', to: '/profile/settings/notifications', icon: BellIcon, section: 'Paramètres', keywords: ['push', 'email'] },
  { label: "Vue d'ensemble", to: '/admin/overview', icon: LayoutDashboardIcon, section: 'Administration', permission: ['view', 'admin'] },
  { label: 'Groupes', to: '/admin/groups', icon: UsersRoundIcon, section: 'Administration', keywords: ['pupitres'], permission: ['view', 'admin'] },
  { label: 'Rôles et permissions', to: '/admin/roles', icon: KeyRoundIcon, section: 'Administration', permission: ['view', 'admin'] },
  { label: 'Membres', to: '/admin/members', icon: UsersIcon, section: 'Administration', keywords: ['comptes'], permission: ['view', 'admin'] },
  { label: 'Adhésions', to: '/admin/memberships', icon: WalletIcon, section: 'Administration', keywords: ['helloasso'], permission: ['view', 'admin'] },
  { label: 'Communication', to: '/admin/communication', icon: MegaphoneIcon, section: 'Administration', keywords: ['mailing', 'listes'], permission: ['view', 'admin'] },
  { label: 'Sécurité', to: '/admin/security', icon: ShieldCheckIcon, section: 'Administration', keywords: ['passkeys', 'sessions'], permission: ['view', 'admin'] },
  { label: 'Système', to: '/admin/system', icon: ActivityIcon, section: 'Administration', keywords: ['statut', 'intégrations'], permission: ['view', 'admin'] },
];

export const PAGE_RESULTS_LIMIT = 5;

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
