import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import {
  queryClient, useApiClient, usePermissions, useUserProfile,
} from '../../config/client';
import ProfileView from './components/profile';

export default function ShowProfilePage() {
  const { usersApi } = useApiClient();
  const currentUser = useUserProfile();
  const { can } = usePermissions();
  const { profileId } = useParams<{ profileId: string }>();
  if (!profileId) {
    return null;
  }

  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ['profiles', profileId],
    queryFn: () => usersApi.getProfileApiV1ProfilesProfileIdGet({ profileId }),
  });

  const { mutate: deleteProfile } = useMutation({
    mutationFn: () => toast.promise(
      usersApi.deleteProfileApiV1ProfilesProfileIdDelete({ profileId }),
      {
        loading: 'Suppression...',
        success: 'Profil désactivé avec succès !',
        error: 'Une erreur est survenue.',
      },
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      navigate('/profile');
    },
  });

  const handleDelete = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm(`Êtes-vous sûr de vouloir désactiver le profil de ${profile?.firstName} ${profile?.lastName} ?`)) {
      deleteProfile();
    }
  };

  if (!profile) {
    return null;
  }

  const actions = [];
  if (can('edit', 'profile') || profileId === currentUser?.id) {
    actions.push(
      <Header.Action key="edit-profile" onClick={() => navigate(`/profile/edit/${profileId}`)}>Modifier le profil</Header.Action>,
    );
  }
  if (can('delete', 'profile') && profileId !== currentUser?.id) {
    actions.push(
      <Header.Action key="delete-profile" icon={faTrash} variant="outline" onClick={handleDelete}>Désactiver</Header.Action>,
    );
  }

  return (
    <>
      <Header
        title="Profil"
        subtitle={`${profile.firstName} ${profile.lastName}`}
        actions={actions}
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
