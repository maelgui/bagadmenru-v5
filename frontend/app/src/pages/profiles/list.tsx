import { BellOff, CirclePlus, Medal, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '../../lib/utils';
import { useApiClient, usePermissions } from '../../config/client';

import defaultAvatar from '../../assets/default.svg';

function GroupTag({ name, color }: { name: string, color: string | undefined }) {
  return (
    <span
      className="m-1 inline-block rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground"
      style={color ? {
        backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
        color: `color-mix(in oklab, ${color} 55%, var(--foreground))`,
      } : undefined}
    >
      {name}
    </span>
  );
}

export default function ProfilesPage() {
  const { usersApi } = useApiClient();
  const { can } = usePermissions();

  const { data } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => await usersApi.listProfilesApiV1ProfilesGet(),
  });

  return (
    <>
      <Header
        title="Liste des membres"
        subtitle="Pensez à ajouter votre photo"
        actions={[
          <Link key="edit-profile" className={buttonVariants({ variant: 'outline' })} to="/profile/settings/profile">
            Mes paramètres
          </Link>,
          <Link key="rankings" className={buttonVariants({ variant: 'outline' })} to="/profile/rankings">
            <Medal data-icon="inline-start" />
            Classements
          </Link>,
          <Link
            key="invite"
            className={cn(buttonVariants({ variant: 'outline' }), !can('create', 'invitation') && 'hidden')}
            to="/profile/invite"
          >
            <UserPlus data-icon="inline-start" />
            Inviter
          </Link>,
          <Link
            key="add-profile"
            className={cn(buttonVariants(), !can('create', 'profile') && 'hidden')}
            to="/profile/add"
          >
            <CirclePlus data-icon="inline-start" />
            Ajouter
          </Link>,
        ]}
        breadcrumb={[
          { title: 'Liste des membres' },
        ]}
      />

      <Container>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          {data ? data.map((profile) => (
            <Link
              key={profile.id}
              to={`/profile/${profile.id}`}
              className="block h-full rounded-4xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex h-full flex-col overflow-hidden surface rounded-4xl pb-8 transition-shadow hover:shadow-md">
                <div className="p-8">
                  <div className="relative aspect-square overflow-hidden rounded-full">
                    <img src={profile.pictureUrl ?? defaultAvatar} alt="profile" className="absolute size-full bg-primary/10 object-cover" />
                  </div>
                </div>
                <div className="px-2 pt-4 text-center">
                  <h4 className="my-2 text-lg font-semibold">
                    {`${profile.firstName} ${profile.lastName}`}
                    {!profile.receivesEmails && (
                      <BellOff className="ml-1 inline size-3 text-destructive" aria-label="Ne reçoit pas les emails" />
                    )}
                  </h4>
                  <div className="flex flex-wrap">
                    {profile.groups.map((group) => (
                      <GroupTag key={group.id} name={group.name} color={group.color} />
                    ))}
                  </div>
                </div>

              </div>
            </Link>
          )) : Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-64" />)}
        </div>
      </Container>

    </>

  );
}
