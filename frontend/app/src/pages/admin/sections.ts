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
  { to: 'groups', label: 'Groupes', icon: UsersRoundIcon },
  { to: 'roles', label: 'Rôles et permissions', icon: KeyRoundIcon },
  { to: 'members', label: 'Membres', icon: UsersIcon },
  { to: 'memberships', label: 'Adhésions', icon: WalletIcon },
  { to: 'communication', label: 'Communication', icon: MegaphoneIcon },
  { to: 'security', label: 'Sécurité', icon: ShieldCheckIcon },
  { to: 'system', label: 'Système', icon: ActivityIcon },
];
