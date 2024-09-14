import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';

export default function GroupListPage() {
  const { usersApi } = useApiClient();

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => usersApi.listGroupsApiV1GroupsGet(),
  });

  return (
    <>
      <Header
        title="Liste des groupes"
        subtitle=""
        actions={[]}
        breadcrumb={[
          { title: 'Groupes' },
        ]}
      />

      <Container>
        {groups?.map((group) => (
          <Link key={group.id} to={`/groups/${group.id}`}>
            <h4 className="text-lg">{group.name}</h4>
            <p className="text-gray-500 italic">
              {group.permissions.length}
              {' '}
              permissions
            </p>
          </Link>
        ))}
      </Container>

    </>

  );
}
