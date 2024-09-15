import { useMutation, useQuery } from '@tanstack/react-query';
import { GroupUpdate } from 'bagad-client';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import Avatar from '../../components/avatar';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import PermissionsForm from './components/permissionsForm';

type EditEventParams = {
  groupId: string;
};

export default function GroupPage() {
  const { usersApi } = useApiClient();
  const params = useParams<EditEventParams>();

  const groupId = parseInt(params.groupId!, 10);

  const { data: group } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => usersApi.getGroupApiV1GroupsGroupIdGet({ groupId }),
  });
  const { data: members } = useQuery({
    queryKey: ['groups', groupId, 'members'],
    queryFn: () => usersApi.getGroupMembersApiV1GroupsGroupIdMembersGet({ groupId }),
  });

  const { mutate } = useMutation({
    // eslint-disable-next-line max-len
    mutationFn: (data: GroupUpdate) => usersApi.updateGroupApiV1GroupsGroupIdPut({ groupId, groupUpdate: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
      toast.success('Groupe modifié !');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la création de l'évènement : ${error.message}`);
    },
  });
  const onSubmit = (data: GroupUpdate) => mutate(data);
  // const onSubmit = (data: GroupUpdate) => console.log(data);

  return (
    <>
      <Header
        title={`Groupe ${group?.name}`}
        subtitle={`${members?.length} membres`}
        actions={[]}
        breadcrumb={[
          { title: 'Groupes', link: '/groups' },
          { title: group?.name },
        ]}
      />

      <Container>

        <div className="mb-12">
          <h3 className="text-2xl mb-4">Membres</h3>
          <div className="flex -space-x-2 overflow-hidden">
            {members && members.map((m) => (<Avatar title={m.firstName} className="ring-2 ring-white" key={m.id} src={m.pictureUrl} size="xxs" />))}
          </div>

        </div>
        <div className="mb-12">

          <h3 className="text-2xl mb-4">Permissions</h3>
          {group ? <PermissionsForm data={group} onSubmit={onSubmit} /> : 'loading'}
        </div>

      </Container>

    </>

  );
}
