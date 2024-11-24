import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Badge from '../../components/badge';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions } from '../../config/client';

export default function GroupListPage() {
  const { usersApi } = useApiClient();
  const { can } = usePermissions();

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => usersApi.listGroupsApiV1GroupsGet(),
  });

  return (
    <>
      <Header
        title="Liste des groupes"
        subtitle=""
        actions={can('create', 'group') ? [
          <Header.Action key="add-event" as={Link} to="/groups/add">
            <FontAwesomeIcon icon={faPlusCircle} />
            {' '}
            Ajouter
          </Header.Action>,
        ] : []}
        breadcrumb={[
          { title: 'Groupes' },
        ]}
      />

      <Container>
        {groups?.map((group) => (
          <div key={group.id} className="mb-8">
            <Link to={`/groups/${group.id}`}>
              <Badge className="text-lg" style={{ backgroundColor: group.color }}>{group.name}</Badge>
              <p className="text-gray-500 italic">
                {group.roles.length}
                {' '}
                roles
                {' / '}
                {group.members.length}
                {' '}
                membres
              </p>
              <p className="text-gray-500 italic" />
            </Link>
          </div>
        ))}
      </Container>

    </>

  );
}
