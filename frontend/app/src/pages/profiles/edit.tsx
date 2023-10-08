/* eslint-disable react/jsx-props-no-spreading */
import { useQuery } from '@tanstack/react-query';
import Container from '../../components/container';
import Header from '../../components/header';
import EditProfileForm from './components/form';
import { useApiClient } from '../../config/client';

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
        subtitle=""
        breadcrumb={[
          { title: 'Liste des membres', link: 'users' },
          { title: 'Modifier mon profile' },
        ]}
      />
      <Container>
        {profile ? <EditProfileForm profile={profile} /> : null}
      </Container>
    </>
  );
}
