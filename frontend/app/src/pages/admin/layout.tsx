import { Outlet } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { SectionLayout, SectionNav } from '../../components/section-nav';
import { ADMIN_SECTIONS } from './sections';


export default function AdminLayout() {
  return (
    <>
      <Header
        title="Administration"
        breadcrumb={[{ title: 'Administration' }]}
      />
      <Container>
        <SectionLayout nav={<SectionNav items={ADMIN_SECTIONS} label="Sections de l'administration" />}>
          <Outlet />
        </SectionLayout>
      </Container>
    </>
  );
}
