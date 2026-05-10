import { useMutation, useQuery } from '@tanstack/react-query';
import type { MyProfileUpdate, Profile, ProfileUpdate } from 'bagad-client';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient, usePermissions } from '../../config/client';
import AdminEditProfileForm from './components/adminForm';
import EditProfileForm from './components/myForm';

const messages = {
  loading: 'Chargement...',
  success: 'Profil modifié avec succès !',
  error: 'Une erreur est survenue.',
};

function EditMyProfile({ profile, onSuccess }: { profile: Profile; onSuccess: () => void }) {
  const { usersApi } = useApiClient();
  const { mutate } = useMutation({
    mutationFn: async (data: MyProfileUpdate) => await toast.promise(
      usersApi.updateMyProfileApiV1ProfilesMePut({ myProfileUpdate: data }),
      messages,
    ),
    onSuccess,
  });
  return <EditProfileForm profile={profile} onSubmit={(data) => mutate(data)} />;
}

function EditAdminProfile({ profile, profileId, onSuccess }: { profile?: Profile; profileId: string; onSuccess: () => void }) {
  const { usersApi } = useApiClient();
  const { mutate } = useMutation({
    mutationFn: async (data: ProfileUpdate) => await toast.promise(
      usersApi.updateProfileApiV1ProfilesProfileIdPut({ profileId, profileUpdate: data }),
      messages,
    ),
    onSuccess,
  });
  return <AdminEditProfileForm profile={profile} onSubmit={(data) => mutate(data)} />;
}

export default function EditProfilePage() {
  const { can } = usePermissions();
  const { usersApi } = useApiClient();
  const navigate = useNavigate();

  const { profileId } = useParams<"profileId">();
  if (!profileId) {
    throw new Error('profileId is required');
  }

  const { data: profile } = useQuery({
    queryKey: ['profiles', profileId],
    queryFn: async () => (profileId === 'me'
      ? await usersApi.getMyProfileApiV1ProfilesMeGet()
      : await usersApi.getProfileApiV1ProfilesProfileIdGet({ profileId })
    ),
  });

  if (!profile) {
    return null;
  }

  if (!can('edit', 'profile') && profileId !== 'me') {
    void navigate('/profile/edit/me');
    return null;
  }

  const onSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: ['profiles', profileId] });
    void navigate(`/profile/${profileId}`);
  };

  return (
    <>
      <Header
        title="Modifier un profil"
        subtitle={`${profile.firstName} ${profile.lastName}`}
        breadcrumb={[
          { title: 'Liste des membres', link: '/profile' },
          { title: 'Modifier un profil' },
        ]}
      />
      <Container>
        {profileId === 'me'
          ? <EditMyProfile profile={profile} onSuccess={onSuccess} />
          : <EditAdminProfile profile={profile} profileId={profileId} onSuccess={onSuccess} />
        }
      </Container>
    </>
  );
}
