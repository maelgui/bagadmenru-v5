import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import Avatar from '../../components/avatar';
import Checkbox from '../../components/checkbox';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';
import groupBy from '../../utils/groupby';

type EditEventParams = {
  groupId: string;
};

export default function GroupPage() {
  const { usersApi } = useApiClient();
  const params = useParams<EditEventParams>();

  const groupId = parseInt(params.groupId!, 10);

  const { data } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => usersApi.getGroupApiV1GroupsGroupIdGet({ groupId }),
  });
  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => usersApi.listPermissionsApiV1PermissionsGet(),
    select: (d) => groupBy(d, (e) => e.tag),
  });
  const { data: members } = useQuery({
    queryKey: ['groups', groupId, 'members'],
    queryFn: () => usersApi.getGroupMembersApiV1GroupsGroupIdMembersGet({ groupId }),
  });

  return (
    <>
      <Header
        title="Affichage d'un groupe"
        subtitle=""
        actions={[]}
        breadcrumb={[
          { title: 'Groupes', link: '/groups' },
          { title: data?.name },
        ]}
      />

      <Container>
        <h3 className="text-xl">{data?.name}</h3>
        <div className="flex -space-x-2 overflow-hidden">
          {members && members.map((m) => (<Avatar title={m.firstName} className="ring-2 ring-white" key={m.id} src={m.pictureUrl} size="xxs" />))}
        </div>
        {permissions && data && Array.from(permissions).map(([tag, group]) => (
          <div key={tag} className="mt-8">
            <h3 className="text-lg font-bold mb-4">{tag}</h3>
            <div className="grid grid-cols-3 gap-4">
              {group.map((p) => (
                <div key={p.id}>
                  <Checkbox
                    defaultChecked={data.permissions.map((x) => x.id).includes(p.id)}
                    title={p.id}
                    description={p.description}
                    className="px-2"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </Container>

    </>

  );
}
