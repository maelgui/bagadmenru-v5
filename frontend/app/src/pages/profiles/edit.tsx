import { useMutation, useQuery } from '@tanstack/react-query';
import type { ProfileUpdate } from 'bagad-client';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { toast } from '@/components/ui/toast';
import { queryClient, useApiClient, usePermissions } from '../../config/client';
import AdminEditProfileForm from './components/adminForm';

const messages = {
  loading: 'Chargement...',
  success: 'Profil modifié avec succès !',
  error: 'Une erreur est survenue.',
};

/**
 * Admin-only page to edit another member's profile, including their groups
 * and instrument. Members edit their own profile in /profile/settings instead;
 * "/profile/edit/me" is redirected there at the router level.
 */
export default function EditProfilePage() {
  const { can } = usePermissions();
  const { usersApi } = useApiClient();
  const navigate = useNavigate();

  const { profileId } = useParams<'profileId'>();
  if (!profileId) {
    throw new Error('profileId is required');
  }

  const { data: profile } = useQuery({
    queryKey: ['profiles', profileId],
    // Never fetch for the "me" sentinel: that case redirects to settings.
    enabled: profileId !== 'me',
    queryFn: async () => await usersApi.getProfileApiV1ProfilesProfileIdGet({ profileId }),
  });

  const { mutate } = useMutation({
    mutationFn: async (data: ProfileUpdate) => await toast.promise(
      usersApi.updateProfileApiV1ProfilesProfileIdPut({ profileId, profileUpdate: data }),
      messages,
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profiles', profileId] });
      void navigate(`/profile/${profileId}`);
    },
  });

  // Editing your own profile lives in the settings area.
  if (profileId === 'me') {
    return <Navigate to="/profile/settings/profile" replace />;
  }

  if (!can('edit', 'profile')) {
    return <Navigate to="/profile/settings/profile" replace />;
  }

  if (!profile) {
    return null;
  }

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
        <AdminEditProfileForm profile={profile} onSubmit={(data) => mutate(data)} />
      </Container>
    </>
  );
}
