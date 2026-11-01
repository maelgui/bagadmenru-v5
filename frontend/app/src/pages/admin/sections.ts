import {
  ActivityIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
} from 'lucide-react';
import type { SectionNavItem } from '../../components/section-nav';

export const ADMIN_BASE = '/admin';

export const ADMIN_SECTIONS: SectionNavItem[] = [
  { to: 'overview', label: "Vue d'ensemble", icon: LayoutDashboardIcon },
  { to: 'groups', label: 'Groupes', icon: UsersRoundIcon, keywords: ['pupitres'] },
  { to: 'roles', label: 'Rôles et permissions', icon: KeyRoundIcon },
  { to: 'members', label: 'Membres', icon: UsersIcon, keywords: ['comptes'] },
  { to: 'memberships', label: 'Adhésions', icon: WalletIcon, keywords: ['helloasso'] },
  { to: 'communication', label: 'Communication', icon: MegaphoneIcon, keywords: ['mailing', 'listes'] },
  { to: 'security', label: 'Sécurité', icon: ShieldCheckIcon, keywords: ['passkeys', 'sessions'] },
  { to: 'system', label: 'Système', icon: ActivityIcon, keywords: ['statut', 'intégrations'] },
];
