import { useMutation, useQuery } from '@tanstack/react-query';
import { MyProfileUpdate, ProfileUpdate } from 'bagad-client';
import toast from 'react-hot-toast';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient, usePermissions } from '../../config/client';
import AdminEditProfileForm from './components/adminForm';
import EditProfileForm from './components/myForm';

export default function EditProfilePage() {
  const { usersApi } = useApiClient();
  const { has } = usePermissions();

  const { data: profile } = useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: () => usersApi.getMyProfileApiV1ProfilesMeGet(),
  });

  const { mutate: adminMutate } = useMutation({
    mutationFn: (data: ProfileUpdate) => usersApi.updateProfileApiV1ProfilesProfileIdPut({
      profileId: profile!.id,
      profileUpdate: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] });
      toast.success('Profile modifié avec succès !');
    },
  });
  const { mutate: meMutate } = useMutation({
    mutationFn: (data: MyProfileUpdate) => usersApi.updateMyProfileApiV1ProfilesMePut({
      myProfileUpdate: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] });
      toast.success('Profile modifié avec succès !');
    },
  });

  const Form = has('ProfilesScopes.UPDATE') ? AdminEditProfileForm : EditProfileForm;
  const onSubmit = has('ProfilesScopes.UPDATE')
    ? (data: ProfileUpdate) => adminMutate(data)
    : (data: ProfileUpdate) => meMutate(data);

  return (
    <>
      <Header
        title="Modifier mon profile"
        subtitle={`${profile?.firstName} ${profile?.lastName}`}
        breadcrumb={[
          { title: 'Liste des membres', link: '/profile' },
          { title: 'Modifier mon profile' },
        ]}
      />
      <Container>
        {profile ? <Form profile={profile} onSubmit={onSubmit} /> : null}
      </Container>
    </>
  );
}
