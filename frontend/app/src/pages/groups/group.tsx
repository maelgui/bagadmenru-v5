import { faPen } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import Avatar from '../../components/avatar';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';

type GroupPageParams = {
  groupId: string;
};

export default function GroupPage() {
  const { usersApi } = useApiClient();
  const params = useParams<GroupPageParams>();

  const groupId = parseInt(params.groupId!, 10);

  const { data: group } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => usersApi.getGroupApiV1GroupsGroupIdGet({ groupId }),
  });

  return (
    <>
      <Header
        title={`Groupe ${group?.name}`}
        subtitle={`${group?.members.length} membres`}
        actions={[
          <Header.Action key="add-event" icon={faPen} as={Link} to={`/groups/edit/${group?.id}`}>
            Modifier
          </Header.Action>,
        ]}
        breadcrumb={[
          { title: 'Groupes', link: '/groups' },
          { title: group?.name },
        ]}
      />

      <Container>

        <div className="mb-12">
          <h3 className="text-2xl mb-4">Membres</h3>
          <div className="flex -space-x-2 overflow-hidden">
            {group?.members.map((m) => (<Avatar title={m.firstName} className="ring-2 ring-white" key={m.id} src={m.pictureUrl} size="xxs" />))}
          </div>

        </div>
        <div className="mb-12">

          <h3 className="text-2xl mb-4">Roles</h3>
          <ul className="list-disc">
            {group?.roles.map((role) => (
              <li key={role.id} className="mb-2">
                <h6>{role.id}</h6>
                <p className="text-sm text-gray-500">{role.description}</p>
              </li>
            ))}

          </ul>
        </div>

      </Container>

    </>

  );
}
