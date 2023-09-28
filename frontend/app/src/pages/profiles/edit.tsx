/* eslint-disable react/jsx-props-no-spreading */
import { useQuery } from '@tanstack/react-query';
import Container from '../../components/container';
import Header from '../../components/header';
import { usersApi } from '../../config/client';
import EditProfileForm from './components/form';

export default function EditProfilePage() {
  const { data: profile } = useQuery({ queryKey: ['profiles'], queryFn: () => usersApi.getMyProfileApiV1ProfilesMeGet() });

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
