import { useMutation } from '@tanstack/react-query';
import { GroupCreate } from 'bagad-client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import GroupForm from './components/groupForm';

export default function AddGroupPage() {
  const { usersApi } = useApiClient();
  const navigate = useNavigate();

  const { mutate } = useMutation({
    mutationFn: (data: GroupCreate) => usersApi.createGroupApiV1GroupsPost({ groupCreate: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      navigate('/groups');
      toast.success('Groupe crée !');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la création du groupe : ${error.message}`);
    },
  });
  const onSubmit = (data: GroupCreate) => mutate(data);
  // const onSubmit = (data: GroupCreate) => console.log(data);

  return (
    <>
      <Header
        title="Nouveau groupe"
        subtitle=""
        actions={[]}
        breadcrumb={[
          { title: 'Groupes', link: '/groups' },
          { title: 'Nouveau groupe' },
        ]}
      />

      <Container>
        <GroupForm onSubmit={onSubmit} />
      </Container>

    </>

  );
}
