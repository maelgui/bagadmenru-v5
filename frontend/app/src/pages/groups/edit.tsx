import { useMutation, useQuery } from '@tanstack/react-query';
import type { GroupCreate, GroupUpdate } from 'bagad-client';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/components/ui/toast';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import GroupForm from './components/groupForm';

export default function EditGroupPage() {
  const { usersApi } = useApiClient();
  const navigate = useNavigate();
  const { groupId: groupIdRaw } = useParams<'groupId'>();
  if (!groupIdRaw) {
    throw new Error('Missing groupId');
  }
  const groupId = parseInt(groupIdRaw, 10);
  const { data: group } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: async () => await usersApi.getGroupApiV1GroupsGroupIdGet({ groupId }),
    select: (data) => ({ roleIds: data.roles.map((role) => role.id), ...data }),
  });
  const { mutate } = useMutation({
    mutationFn: async (data: GroupUpdate) => await usersApi.updateGroupApiV1GroupsGroupIdPut({ groupId, groupUpdate: data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      await queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
      void navigate('/groups');
      toast.add({ title: 'Groupe modifié !', type: 'success' });
    },
    onError: (error) => {
      toast.add({ title: `Erreur lors de la modification du groupe : ${error.message}`, type: 'error' });
    },
  });
  const onSubmit = (data: GroupCreate) => mutate(data);

  return (
    <>
      <Header
        title="Modifier un groupe"
        subtitle={group?.name}
        actions={[]}
        breadcrumb={[{ title: 'Groupes', link: '/groups' }, { title: 'Modifier un groupe' }]}
      />
      <Container>{group ? <GroupForm onSubmit={onSubmit} data={group} /> : null}</Container>
    </>
  );
}
