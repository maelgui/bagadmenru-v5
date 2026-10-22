import type { LucideIcon } from 'lucide-react';
import {
  KeyRoundIcon,
  SmartphoneIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { buildOverview, type OverviewAlert, plural } from '../overviewUtils';
import {
  useAdminMembers,
  useAdminRoles,
  useGroups,
  useUnlinkedMemberships,
} from '../queries';

type Overview = ReturnType<typeof buildOverview>;

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  detail?: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-4xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex items-start gap-4">
          <span className="rounded-2xl bg-primary/15 p-3 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-3xl tabular-nums">
              {value === undefined ? <Skeleton className="h-9 w-12" /> : value}
            </CardTitle>
            <CardDescription>{label}</CardDescription>
            {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AlertLink({ alert }: { alert: OverviewAlert }) {
  const Icon = alert.icon;
  return (
    <Link
      to={alert.to}
      className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Alert>
        <Icon />
        <AlertTitle>{alert.title}</AlertTitle>
        <AlertDescription>{alert.description}</AlertDescription>
      </Alert>
    </Link>
  );
}

function StatGrid({ overview, groups, roles }: {
  overview: Overview | undefined;
  groups: number | undefined;
  roles: number | undefined;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        icon={UsersIcon}
        label="Membres actifs"
        value={overview?.membersActive}
        detail={overview ? plural(overview.membersInactive, 'inactif') : undefined}
        to="/admin/members"
      />
      <StatCard icon={UsersRoundIcon} label="Groupes" value={groups} to="/admin/groups" />
      <StatCard icon={KeyRoundIcon} label="Rôles" value={roles} to="/admin/roles" />
      <StatCard icon={WalletIcon} label="Adhésions à jour" value={overview?.membershipsActive} to="/admin/memberships" />
      <StatCard
        icon={SmartphoneIcon}
        label="Appareils push"
        value={overview?.pushDevices}
        detail={overview ? plural(overview.membersWithPush, 'membre') : undefined}
        to="/admin/communication"
      />
      <StatCard icon={KeyRoundIcon} label="Clés d'API actives" value={overview?.apiKeys} to="/admin/security" />
    </div>
  );
}

export default function OverviewSection() {
  const { data: members } = useAdminMembers();
  const { data: groups } = useGroups();
  const { data: roles } = useAdminRoles();
  const { data: unlinked } = useUnlinkedMemberships();

  const overview = members && groups && unlinked
    ? buildOverview(members, groups, unlinked.length)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      {overview?.alerts.map((alert) => <AlertLink key={alert.key} alert={alert} />)}
      <StatGrid overview={overview} groups={groups?.length} roles={roles?.length} />
    </div>
  );
}
