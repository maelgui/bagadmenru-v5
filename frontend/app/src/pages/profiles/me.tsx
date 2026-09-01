import { KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { Button } from '@/components/ui/button';
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
          <Button key="passkeys" variant="outline" onClick={async () => await navigate('/profile/passkeys')}>
            <KeyRound data-icon="inline-start" />
            Passkeys
          </Button>,
          <Button key="edit-profile" onClick={async () => await navigate('/profile/edit/me')}>
            Modifier mon profil
          </Button>,
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
