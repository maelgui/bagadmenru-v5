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
import { Outlet } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { SectionLayout, SectionNav, type SectionNavItem } from '../../components/section-nav';

const NAV_ITEMS: SectionNavItem[] = [
  { to: 'overview', label: "Vue d'ensemble", icon: LayoutDashboardIcon },
  { to: 'groups', label: 'Groupes', icon: UsersRoundIcon },
  { to: 'roles', label: 'Rôles et permissions', icon: KeyRoundIcon },
  { to: 'members', label: 'Membres', icon: UsersIcon },
  { to: 'memberships', label: 'Adhésions', icon: WalletIcon },
  { to: 'communication', label: 'Communication', icon: MegaphoneIcon },
  { to: 'security', label: 'Sécurité', icon: ShieldCheckIcon },
  { to: 'system', label: 'Système', icon: ActivityIcon },
];

export default function AdminLayout() {
  return (
    <>
      <Header
        title="Administration"
        breadcrumb={[{ title: 'Administration' }]}
      />
      <Container>
        <SectionLayout nav={<SectionNav items={NAV_ITEMS} label="Sections de l'administration" />}>
          <Outlet />
        </SectionLayout>
      </Container>
    </>
  );
}
