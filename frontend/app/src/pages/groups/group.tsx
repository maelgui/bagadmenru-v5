import { AlertCircle, Pen, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Group } from 'bagad-client';
import { Link, useParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import AvatarGroup from '../../components/avatar-group';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';

/** Limit of member avatars shown before collapsing the rest into a "+N" avatar. */
const MAX_VISIBLE_MEMBERS = 20;

function roleBadgeStyle(color?: string) {
  if (!color) return undefined;
  return {
    backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
    color: `color-mix(in oklab, ${color} 55%, var(--foreground))`,
  };
}

function MembersSection({ group }: { group: Group }) {
  return (
    <section className="mb-12">
      <h3 className="mb-4 text-2xl">Membres</h3>
      <AvatarGroup
        size="xxs"
        max={MAX_VISIBLE_MEMBERS}
        avatars={group.members.map((member) => ({
          id: member.id,
          name: `${member.firstName} ${member.lastName}`,
          src: member.pictureUrl,
        }))}
        emptyMessage="Aucun membre dans ce groupe."
      />
    </section>
  );
}

function RolesSection({ group }: { group: Group }) {
  return (
    <section className="mb-12">
      <h3 className="mb-4 text-2xl">Rôles</h3>
      {group.roles.length ? (
        <ul className="flex flex-col gap-4">
          {group.roles.map((role) => (
            <li key={role.id} className="flex flex-col gap-1">
              <Badge className="self-start bg-muted text-muted-foreground" style={roleBadgeStyle(group.color)}>
                {role.id}
              </Badge>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Users /></EmptyMedia>
            <EmptyTitle>Aucun rôle</EmptyTitle>
            <EmptyDescription>Ce groupe n&apos;a aucun rôle associé.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}

function GroupPageSkeleton() {
  return (
    <>
      <div className="mb-12">
        <Skeleton className="mb-4 h-8 w-32" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="mb-12">
        <Skeleton className="mb-4 h-8 w-24" />
        <Skeleton className="h-16 w-full max-w-md" />
      </div>
    </>
  );
}

function GroupHeader({ group }: { group?: Group }) {
  const breadcrumb = (title: React.ReactNode) => [{ title: 'Groupes', link: '/groups' }, { title }];

  if (!group) {
    return (
      <Header
        title={<Skeleton className="h-9 w-64" />}
        subtitle={<Skeleton className="h-5 w-32" />}
        breadcrumb={breadcrumb(<Skeleton className="inline-block h-4 w-20 align-middle" />)}
      />
    );
  }

  const { length: memberCount } = group.members;
  const { length: roleCount } = group.roles;

  return (
    <Header
      title={`Groupe ${group.name}`}
      subtitle={`${memberCount} membre${memberCount > 1 ? 's' : ''} · ${roleCount} rôle${roleCount > 1 ? 's' : ''}`}
      actions={[
        <Link key="edit-group" to={`/groups/edit/${group.id}`} className={cn(buttonVariants())}>
          <Pen data-icon="inline-start" />
          Modifier
        </Link>,
      ]}
      breadcrumb={breadcrumb(group.name)}
    />
  );
}

export default function GroupPage() {
  const { usersApi } = useApiClient();
  const { groupId: groupIdRaw } = useParams<'groupId'>();
  if (!groupIdRaw) {
    throw new Error('Missing group id');
  }

  const groupId = parseInt(groupIdRaw, 10);
  const { data: group, status } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: async () => await usersApi.getGroupApiV1GroupsGroupIdGet({ groupId }),
  });

  return (
    <>
      <GroupHeader group={group} />
      <Container>
        {status === 'error' ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>Impossible de charger ce groupe.</AlertDescription>
          </Alert>
        ) : null}

        {status === 'pending' ? <GroupPageSkeleton /> : null}

        {status === 'success' ? (
          <>
            <MembersSection group={group} />
            <RolesSection group={group} />
          </>
        ) : null}
      </Container>
    </>
  );
}
