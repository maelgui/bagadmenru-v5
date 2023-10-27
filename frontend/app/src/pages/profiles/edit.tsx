import { useQuery } from '@tanstack/react-query';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';
import EditProfileForm from './components/form';

export default function EditProfilePage() {
  const { usersApi } = useApiClient();

  const { data: profile } = useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: () => usersApi.getMyProfileApiV1ProfilesMeGet(),
  });

  return (
    <>
      <Header
        title="Modifier mon profile"
        subtitle={`${profile?.firstName} ${profile?.lastName}`}
        breadcrumb={[
          { title: 'Liste des membres', link: '/users' },
          { title: 'Modifier mon profile' },
        ]}
      />
      <Container>
        {profile ? <EditProfileForm profile={profile} /> : null}
      </Container>
    </>
  );
}
