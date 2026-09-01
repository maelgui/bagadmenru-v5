import { CirclePlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions } from '../../config/client';

export default function GroupListPage() {
  const { usersApi } = useApiClient();
  const { can } = usePermissions();
  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => await usersApi.listGroupsApiV1GroupsGet(),
  });

  return (
    <>
      <Header
        title="Liste des groupes"
        subtitle=""
        actions={can('create', 'group') ? [
          <Link key="add-event" to="/groups/add" className={cn(buttonVariants())}><CirclePlus data-icon="inline-start" />Ajouter</Link>,
        ] : []}
        breadcrumb={[{ title: 'Groupes' }]}
      />
      <Container>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups?.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="flex flex-col gap-2 surface rounded-4xl p-6 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Badge
                className="self-start bg-muted text-lg text-muted-foreground"
                style={group.color ? {
                  backgroundColor: `color-mix(in oklab, ${group.color} 16%, transparent)`,
                  color: `color-mix(in oklab, ${group.color} 55%, var(--foreground))`,
                } : undefined}
              >
                {group.name}
              </Badge>
              <p className="italic text-muted-foreground">
                {group.roles.length} rôles / {group.members.length} membres
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}
