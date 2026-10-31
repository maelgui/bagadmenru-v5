import {
  BellIcon,
  KeyIcon,
  PaletteIcon,
  ShieldIcon,
  UserIcon,
  UserRoundCogIcon,
  WalletIcon,
} from 'lucide-react';
import type { SectionNavItem } from '../../../components/section-nav';

export const SETTINGS_BASE = '/profile/settings';

export const SETTINGS_SECTIONS: SectionNavItem[] = [
  { to: 'profile', label: 'Profil', icon: UserIcon },
  { to: 'account', label: 'Compte', icon: UserRoundCogIcon },
  { to: 'appearance', label: 'Apparence', icon: PaletteIcon },
  { to: 'membership', label: 'Adhésion', icon: WalletIcon },
  { to: 'security', label: 'Sécurité', icon: ShieldIcon },
  { to: 'api', label: 'Accès API', icon: KeyIcon },
  { to: 'notifications', label: 'Notifications', icon: BellIcon },
];
