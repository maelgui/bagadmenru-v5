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
  { to: 'profile', label: 'Profil', icon: UserIcon, keywords: ['photo', 'nom'] },
  { to: 'account', label: 'Compte', icon: UserRoundCogIcon, keywords: ['email', 'déconnexion'] },
  { to: 'appearance', label: 'Apparence', icon: PaletteIcon, keywords: ['thème', 'sombre', 'clair'] },
  { to: 'membership', label: 'Adhésion', icon: WalletIcon, keywords: ['cotisation', 'helloasso'] },
  { to: 'security', label: 'Sécurité', icon: ShieldIcon, keywords: ['passkey', 'mot de passe', 'sessions'] },
  { to: 'api', label: 'Accès API', icon: KeyIcon, keywords: ['clé', 'ics', 'calendrier'] },
  { to: 'notifications', label: 'Notifications', icon: BellIcon, keywords: ['push', 'email'] },
];
