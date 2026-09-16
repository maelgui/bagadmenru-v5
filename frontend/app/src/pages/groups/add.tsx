import { useMutation } from '@tanstack/react-query';
import type { GroupCreate } from 'bagad-client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/toast';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import GroupForm from './components/groupForm';

export default function AddGroupPage() {
  const { usersApi } = useApiClient();
  const navigate = useNavigate();
  const { mutateAsync } = useMutation({
    mutationFn: async (data: GroupCreate) => await usersApi.createGroupApiV1GroupsPost({ groupCreate: data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      void navigate('/groups');
      toast.add({ title: 'Groupe créé !', type: 'success' });
    },
    onError: (error) => {
      toast.add({ title: `Erreur lors de la création du groupe : ${error.message}`, type: 'error' });
    },
  });
  // Await the mutation so react-hook-form's isSubmitting reflects it: with a
  // fire-and-forget mutate() the submit button never disables and a slow
  // network allows a double POST creating two groups.
  const onSubmit = async (data: GroupCreate) => await mutateAsync(data);

  return (
    <>
      <Header
        title="Nouveau groupe"
        subtitle=""
        actions={[]}
        breadcrumb={[{ title: 'Groupes', link: '/groups' }, { title: 'Nouveau groupe' }]}
      />
      <Container><GroupForm onSubmit={onSubmit} /></Container>
    </>
  );
}
