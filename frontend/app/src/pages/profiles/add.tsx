import { useMutation } from '@tanstack/react-query';
import { ProfileCreate } from 'bagad-client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import AdminEditProfileForm from './components/adminForm';

export default function CreateProfilePage() {
  const { usersApi } = useApiClient();
  const navigate = useNavigate();

  const { mutate } = useMutation({
    mutationFn: (data: ProfileCreate) => toast.promise(
      usersApi.createProfileApiV1ProfilesPost({
        profileCreate: data,
      }),
      {
        loading: 'Création...',
        success: 'Profil crée avec succès !',
        error: 'Une erreur est survenue.',
      },
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      navigate('/profile');
    },
  });
  const onSubmit = (data: ProfileCreate) => mutate(data);

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
