import { faKey } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
          <Header.Action key="passkeys" onClick={async () => await navigate('/profile/passkeys')} variant="outline"><FontAwesomeIcon icon={faKey} /></Header.Action>,
          <Header.Action key="edit-profile" onClick={async () => await navigate('/profile/edit/me')}>Modifier mon profil</Header.Action>,
        ]}
        breadcrumb={[
          { title: 'Profils', link: '/profile' },
          { title: 'Mon profil' },
        ]}
      />

      <Container>
        <ProfileView profile={profile} />
      </Container>
    </>
  );
}
