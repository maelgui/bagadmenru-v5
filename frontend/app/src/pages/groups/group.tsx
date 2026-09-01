import { Pen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';

export default function GroupPage() {
  const { usersApi } = useApiClient();
  const { groupId: groupIdRaw } = useParams<'groupId'>();
  if (!groupIdRaw) {
    throw new Error('Missing group id');
  }

  const groupId = parseInt(groupIdRaw, 10);
  const { data: group } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: async () => await usersApi.getGroupApiV1GroupsGroupIdGet({ groupId }),
  });

  return (
    <>
      <Header
        title={`Groupe ${group?.name}`}
        subtitle={`${group?.members.length} membres`}
        actions={[
          <Link key="add-event" to={`/groups/edit/${group?.id}`} className={cn(buttonVariants())}>
            <Pen data-icon="inline-start" />
            Modifier
          </Link>,
        ]}
        breadcrumb={[{ title: 'Groupes', link: '/groups' }, { title: group?.name }]}
      />
      <Container>
        <div className="mb-12">
          <h3 className="mb-4 text-2xl">Membres</h3>
          <div className="flex overflow-hidden">
            {group?.members.map((member, index) => (
              <Avatar title={member.firstName} className={index === 0 ? 'size-10 ring-2 ring-background' : '-ml-2 size-10 ring-2 ring-background'} key={member.id}>
                <AvatarImage src={member.pictureUrl ?? undefined} alt={member.firstName} />
                <AvatarFallback>{member.firstName.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
        <div className="mb-12">
          <h3 className="mb-4 text-2xl">Rôles</h3>
          <ul className="list-disc">
            {group?.roles.map((role) => (
              <li key={role.id} className="mb-2">
                <h6>{role.id}</h6>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </>
  );
}
