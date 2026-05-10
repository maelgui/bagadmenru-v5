import { useMutation, useQuery } from '@tanstack/react-query';
import type { GroupCreate, GroupUpdate } from 'bagad-client';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import GroupForm from './components/groupForm';


export default function EditGroupPage() {
  const { usersApi } = useApiClient();
  const navigate = useNavigate();

  const { groupId: groupIdRaw } = useParams<"groupId">();
  if (!groupIdRaw) {
    throw new Error("Missing groupId");
  }
  const groupId = parseInt(groupIdRaw, 10);

  const { data: group } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: async () => await usersApi.getGroupApiV1GroupsGroupIdGet({ groupId }),
    select: (data) => ({
      roleIds: data.roles.map((p) => p.id),
      ...data,
    }),
  });

  const { mutate } = useMutation({

    mutationFn: async (data: GroupUpdate) => await usersApi.updateGroupApiV1GroupsGroupIdPut({ groupId, groupUpdate: data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      await queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
      void navigate('/groups');
      toast.success('Groupe modifié !');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la modification du groupe : ${error.message}`);
    },
  });
  const onSubmit = (data: GroupCreate) => mutate(data);

  return (
    <>
      <Header
        title="Modifier un groupe"
        subtitle={group?.name}
        actions={[]}
        breadcrumb={[
          { title: 'Groupes', link: '/groups' },
          { title: 'Nouveau groupe' },
        ]}
      />

      <Container>
        {group ? <GroupForm onSubmit={onSubmit} data={group} /> : null}
      </Container>

    </>

  );
}
