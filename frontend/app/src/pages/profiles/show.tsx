import { Trash2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import {
  queryClient, useApiClient, usePermissions, useUserProfile,
} from '../../config/client';
import ProfileView from './components/profile';
import MembershipBadge from './components/membershipBadge';

export default function ShowProfilePage() {
  const { usersApi } = useApiClient();
  const currentUser = useUserProfile();
  const { can } = usePermissions();
  const { profileId } = useParams<'profileId'>();
  if (!profileId) {
    throw new Error('Missing profile id');
  }

  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ['profiles', profileId],
    queryFn: async () => await usersApi.getProfileApiV1ProfilesProfileIdGet({ profileId }),
  });

  const { mutate: deleteProfile, isPending: isDeactivating } = useMutation({
    mutationFn: async () => await toast.promise(
      usersApi.deleteProfileApiV1ProfilesProfileIdDelete({ profileId }),
      {
        loading: 'Suppression...',
        success: 'Profil désactivé avec succès !',
        error: 'Une erreur est survenue.',
      },
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
      void navigate('/profile');
    },
  });

  if (!profile) {
    return null;
  }

  const actions = [];
  if (can('edit', 'profile') || profileId === currentUser?.id) {
    actions.push(
      <Button key="edit-profile" onClick={async () => await navigate(`/profile/edit/${profileId}`)}>Modifier le profil</Button>,
    );
  }
  if (can('delete', 'profile') && profileId !== currentUser?.id) {
    actions.push(
      <AlertDialog key="delete-profile">
        <AlertDialogTrigger render={<Button variant="outline" />}>
          <Trash2 data-icon="inline-start" />
          Désactiver
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver ce profil ?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Êtes-vous sûr de vouloir désactiver le profil de ${profile.firstName} ${profile.lastName} ?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              pending={isDeactivating}
              onClick={() => deleteProfile()}
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
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
        <ProfileView profile={profile} />
        {can('view', 'membership') && (
          <div className="mt-6 flex justify-center">
            <MembershipBadge profileId={profileId} />
          </div>
        )}
      </Container>
    </>
  );
}
