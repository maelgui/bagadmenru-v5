import {
  BellIcon,
  KeyIcon,
  type LucideIcon,
  PaletteIcon,
  ShieldIcon,
  UserIcon,
  UserRoundCogIcon,
  WalletIcon,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { useUserProfile } from '../../config/client';
import { cn } from '@/lib/utils';

interface SettingsNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** When false, the item is a placeholder for a future section. */
  enabled: boolean;
}

/**
 * Settings sections. Enabled items are wired to a sub-route; disabled ones are
 * placeholders for sections planned but not yet implemented (see router).
 */
const NAV_ITEMS: SettingsNavItem[] = [
  { to: 'profile', label: 'Profil', icon: UserIcon, enabled: true },
  { to: 'account', label: 'Compte', icon: UserRoundCogIcon, enabled: true },
  { to: 'appearance', label: 'Apparence', icon: PaletteIcon, enabled: true },
  { to: 'membership', label: 'Adhésion', icon: WalletIcon, enabled: false },
  { to: 'security', label: 'Sécurité', icon: ShieldIcon, enabled: true },
  { to: 'api', label: 'Accès API', icon: KeyIcon, enabled: false },
  { to: 'notifications', label: 'Notifications', icon: BellIcon, enabled: true },
];

function SettingsNav() {
  const items = NAV_ITEMS.filter((item) => item.enabled);

  return (
    <nav aria-label="Sections des paramètres">
      <ul
        className={cn(
          // Mobile: horizontal scroll bar. Desktop: vertical sticky column.
          'flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0',
        )}
      >
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="shrink-0">
            <NavLink
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                'hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                isActive ? 'bg-muted text-primary' : 'text-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Layout for the account settings area: a sticky navigation (sidebar on
 * desktop, horizontal bar on mobile) and an <Outlet> that renders the active
 * section sub-route.
 */
export default function SettingsLayout() {
  const profile = useUserProfile();

  if (!profile) {
    return null;
  }

  return (
    <>
      <Header
        title="Paramètres"
        subtitle={`${profile.firstName} ${profile.lastName}`}
        breadcrumb={[
          { title: 'Mon profil', link: '/profile/me' },
          { title: 'Paramètres' },
        ]}
      />

      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <div className="lg:w-64 lg:shrink-0">
            <div className="lg:sticky lg:top-6">
              <SettingsNav />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </Container>
    </>
  );
}
