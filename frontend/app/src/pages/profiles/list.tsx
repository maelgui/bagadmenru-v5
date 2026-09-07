import { BadgeAlert, BadgeCheck, BellOff, CircleDashed, CirclePlus, Medal, UserPlus, WalletIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MembershipStatus } from 'bagad-client';
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

// Membership status, shown only when the API populates `membershipStatus`
// (i.e. the current user holds `view:membership`). A small pill echoing the
// group tags' style, colour-coded per status:
//   active  -> green, labelled with the paid season (e.g. "2026-2027")
//   expired -> amber, "Expirée"
//   none    -> muted, "Sans adhésion"
const MEMBERSHIP_META: Record<
  MembershipStatus,
  { icon: typeof BadgeCheck; className: string; label: string; aria: string }
> = {
  [MembershipStatus.Active]: {
    icon: BadgeCheck,
    className: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
    label: 'À jour',
    aria: 'Adhésion à jour',
  },
  [MembershipStatus.Expired]: {
    icon: BadgeAlert,
    className: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    label: 'Expirée',
    aria: 'Adhésion expirée',
  },
  [MembershipStatus.None]: {
    icon: CircleDashed,
    className: 'bg-muted text-muted-foreground',
    label: 'Sans adhésion',
    aria: 'Aucune adhésion',
  },
};

function MembershipBadge({
  status,
  season,
}: {
  status?: MembershipStatus | null;
  season?: string | null;
}) {
  if (status == null) {
    return null;
  }
  const meta = MEMBERSHIP_META[status];
  const Icon = meta.icon;
  // Only the active pill shows the season label; expired/none use their text.
  const text = status === MembershipStatus.Active && season ? season : meta.label;
  const aria = status === MembershipStatus.Active && season
    ? `${meta.aria}, saison ${season}`
    : meta.aria;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        meta.className,
      )}
      aria-label={aria}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {text}
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
            key="memberships"
            className={cn(buttonVariants({ variant: 'outline' }), !can('view', 'membership') && 'hidden')}
            to="/profile/membership/reconciliation"
          >
            <WalletIcon data-icon="inline-start" />
            Adhésions
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
                <div className="flex flex-col items-center gap-2 px-2 pt-4 text-center">
                  <h4 className="text-lg font-semibold">
                    {`${profile.firstName} ${profile.lastName}`}
                    {!profile.receivesEmails && (
                      <BellOff className="ml-1 inline size-3 text-destructive" aria-label="Ne reçoit pas les emails" />
                    )}
                  </h4>
                  <MembershipBadge
                    status={profile.membershipStatus}
                    season={profile.membershipActiveSeason}
                  />
                  {profile.groups.length > 0 && (
                    <div className="-m-1 flex flex-wrap justify-center">
                      {profile.groups.map((group) => (
                        <GroupTag key={group.id} name={group.name} color={group.color} />
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </Link>
          )) : Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-64" />)}
        </div>
      </Container>

    </>

  );
}
