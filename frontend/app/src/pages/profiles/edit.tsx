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

  const { mutate } = useMutation({
    mutationFn: profileId === 'me'
      ? (data: MyProfileUpdate) => usersApi.updateMyProfileApiV1ProfilesMePut({
        myProfileUpdate: data,
      })
      : (data: ProfileUpdate) => usersApi.updateProfileApiV1ProfilesProfileIdPut({
        profileId,
        profileUpdate: data,
      }),
    onSuccess: (data) => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId] });
      toast.success('Profil modifié avec succès !');
      navigate(`/profile/${profileId}`);
    },
  });

  const Form = profileId === 'me' ? EditProfileForm : AdminEditProfileForm;
  const onSubmit = (data: ProfileUpdate) => mutate(data);

  if (!profile) {
    return null;
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
        {profile ? <Form profile={profile} onSubmit={onSubmit} /> : null}
      </Container>
    </>
  );
}
