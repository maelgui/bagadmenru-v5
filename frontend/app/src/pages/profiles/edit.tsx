import { useMutation, useQuery } from '@tanstack/react-query';
import { MyProfileUpdate, ProfileUpdate } from 'bagad-client';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient, usePermissions } from '../../config/client';
import AdminEditProfileForm from './components/adminForm';
import EditProfileForm from './components/myForm';

export default function EditProfilePage() {
  const { usersApi } = useApiClient();
  const { has } = usePermissions();

  const { profileId } = useParams<{ profileId: string }>();
  if (!profileId) {
    return null;
  }

  if (!has('ProfilesScopes.UPDATE') && profileId !== 'me') {
    const navigate = useNavigate();
    navigate('/profile/edit/me');
    return null;
  }

  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ['profiles', profileId],
    queryFn: () => (profileId === 'me'
      ? usersApi.getMyProfileApiV1ProfilesMeGet()
      : usersApi.getProfileApiV1ProfilesProfileIdGet({ profileId })
    ),
  });

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['profiles', profileId] });
    navigate(`/profile/${profileId}`);
  };

  if (!profile) {
    return null;
  }

  const messages = {
    loading: 'Chargement...',
    success: 'Profil modifié avec succès !',
    error: 'Une erreur est survenue.',
  };

  let form;
  if (profileId === 'me') {
    const { mutate } = useMutation({
      mutationFn: (data: MyProfileUpdate) => toast.promise(
        usersApi.updateMyProfileApiV1ProfilesMePut({
          myProfileUpdate: data,
        }),
        messages,
      ),
      onSuccess,
    });
    form = <EditProfileForm profile={profile} onSubmit={(data) => mutate(data)} />;
  } else {
    const { mutate } = useMutation({
      mutationFn: (data: ProfileUpdate) => toast.promise(
        usersApi.updateProfileApiV1ProfilesProfileIdPut({
          profileId,
          profileUpdate: data,
        }),
        messages,
      ),
      onSuccess,
    });
    form = <AdminEditProfileForm profile={profile} onSubmit={(data) => mutate(data)} />;
  }

  return (
    <>
      <Header
        title="Modifier un profile"
        subtitle={`${profile.firstName} ${profile.lastName}`}
        breadcrumb={[
          { title: 'Liste des membres', link: '/profile' },
          { title: 'Modifier un profile' },
        ]}
      />
      <Container>
        {profile ? form : null}
      </Container>
    </>
  );
}
