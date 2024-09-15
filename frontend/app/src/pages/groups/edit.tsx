import { useMutation, useQuery } from '@tanstack/react-query';
import { GroupCreate, GroupUpdate } from 'bagad-client';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import GroupForm from './components/groupForm';

type EditGroupPageParams = {
  groupId: string;
};

export default function EditGroupPage() {
  const { usersApi } = useApiClient();
  const navigate = useNavigate();

  const params = useParams<EditGroupPageParams>();
  const groupId = parseInt(params.groupId!, 10);

  const { data: group } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => usersApi.getGroupApiV1GroupsGroupIdGet({ groupId }),
    select: (data) => ({
      name: data.name,
      color: data.color,
      permissionIds: data.permissions.map((p) => p.id),
    }),
  });

  const { mutate } = useMutation({
    // eslint-disable-next-line max-len
    mutationFn: (data: GroupUpdate) => usersApi.updateGroupApiV1GroupsGroupIdPut({ groupId, groupUpdate: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
      navigate('/groups');
      toast.success('Groupe modifié !');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la modification du groupe : ${error.message}`);
    },
  });
  const onSubmit = (data: GroupCreate) => mutate(data);
  // const onSubmit = (data: GroupCreate) => console.log(data);

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
