import { Outlet } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { SectionLayout, SectionNav } from '../../components/section-nav';
import { useUserProfile } from '../../config/client';
import { SETTINGS_SECTIONS } from './settings/sections';


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
        <SectionLayout nav={<SectionNav items={SETTINGS_SECTIONS} label="Sections des paramètres" />}>
          <Outlet />
        </SectionLayout>
      </Container>
    </>
  );
}
