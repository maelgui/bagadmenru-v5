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
    mutationFn: (data: ProfileCreate) => usersApi.createProfileApiV1ProfilesPost({
      profileCreate: data,
    }),
    onSuccess: (data) => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profil crée avec succès !');
      navigate('/profile');
    },
    onError: (e) => {
      console.log(e);
      toast.error('Une erreur est survenue');
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
