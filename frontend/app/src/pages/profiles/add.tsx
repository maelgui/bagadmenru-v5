import { useMutation } from '@tanstack/react-query';
import type { ProfileCreate } from 'bagad-client';
import { useNavigate } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { toast } from '@/components/ui/toast';
import { queryClient, useApiClient } from '../../config/client';
import AdminEditProfileForm from './components/adminForm';

export default function CreateProfilePage() {
  const { usersApi } = useApiClient();
  const navigate = useNavigate();

  const { mutateAsync } = useMutation({
    mutationFn: async (data: ProfileCreate) => await toast.promise(
      usersApi.createProfileApiV1ProfilesPost({
        profileCreate: data,
      }),
      {
        loading: 'Création...',
        success: 'Profil créé avec succès !',
        error: 'Une erreur est survenue.',
      },
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
      void navigate('/profile');
    },
  });
  // Await the mutation so react-hook-form's isSubmitting reflects it: with a
  // fire-and-forget mutate() the submit button never disables and a slow
  // network allows a double POST creating two profiles.
  const onSubmit = async (data: ProfileCreate) => await mutateAsync(data);

  return (
    <>
      <Header
        title="Créer un profil"
        subtitle=""
        breadcrumb={[
          { title: 'Liste des membres', link: '/profile' },
          { title: 'Créer un profil' },
        ]}
      />
      <Container>
        <AdminEditProfileForm onSubmit={onSubmit} />
      </Container>
    </>
  );
}
