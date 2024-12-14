import { useNavigate } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { useUserProfile } from '../../config/client';
import ProfileView from './components/profile';

export default function ShowMyProfilePage() {
  const navigate = useNavigate();
  const profile = useUserProfile();

  if (!profile) {
    return null;
  }

  return (
    <>
      <Header
        title="Profil"
        subtitle={`${profile.firstName} ${profile.lastName}`}
        actions={[
          <Header.Action key="edit-profile" onClick={() => navigate('/profile/edit/me')}>Modifier mon profil</Header.Action>,
        ]}
        breadcrumb={[
          { title: 'Profils', link: '/profile' },
          { title: 'Mon profil' },
        ]}
      />

      <Container>
        {profile ? <ProfileView profile={profile} /> : 'Loading'}
      </Container>
    </>
  );
}
