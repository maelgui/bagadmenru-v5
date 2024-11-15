import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions, useUserProfile } from '../../config/client';
import ProfileView from './components/profile';

export default function ShowProfilePage() {
  const { usersApi } = useApiClient();
  const currentUser = useUserProfile();
  const { has } = usePermissions();
  const { profileId } = useParams<{ profileId: string }>();
  if (!profileId) {
    return null;
  }

  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ['profiles', profileId],
    queryFn: () => usersApi.getProfileApiV1ProfilesProfileIdGet({ profileId }),
  });

  if (!profile) {
    return null;
  }

  return (
    <>
      <Header
        title="Profil"
        subtitle={`${profile.firstName} ${profile.lastName}`}
        actions={has('ProfilesScopes.UPDATE') || profileId === currentUser?.id
          ? [<Header.Action key="edit-profile" onClick={() => navigate(`/profile/edit/${profileId}`)}>Modifier le profil</Header.Action>]
          : []}
        breadcrumb={[
          { title: 'Profils', link: '/profile' },
          { title: `${profile.firstName} ${profile.lastName}` },
        ]}
      />

      <Container>
        {profile ? <ProfileView profile={profile} /> : 'Loading'}
      </Container>
    </>
  );
}
