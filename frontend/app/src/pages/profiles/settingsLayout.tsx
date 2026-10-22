import {
  BellIcon,
  KeyIcon,
  PaletteIcon,
  ShieldIcon,
  UserIcon,
  UserRoundCogIcon,
  WalletIcon,
} from 'lucide-react';
import { Outlet } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { SectionLayout, SectionNav, type SectionNavItem } from '../../components/section-nav';
import { useUserProfile } from '../../config/client';

const NAV_ITEMS: SectionNavItem[] = [
  { to: 'profile', label: 'Profil', icon: UserIcon },
  { to: 'account', label: 'Compte', icon: UserRoundCogIcon },
  { to: 'appearance', label: 'Apparence', icon: PaletteIcon },
  { to: 'membership', label: 'Adhésion', icon: WalletIcon },
  { to: 'security', label: 'Sécurité', icon: ShieldIcon },
  { to: 'api', label: 'Accès API', icon: KeyIcon },
  { to: 'notifications', label: 'Notifications', icon: BellIcon },
];

/**
 * Layout for the account settings area: a section navigation and an <Outlet>
 * that renders the active section sub-route.
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
        <SectionLayout nav={<SectionNav items={NAV_ITEMS} label="Sections des paramètres" />}>
          <Outlet />
        </SectionLayout>
      </Container>
    </>
  );
}
