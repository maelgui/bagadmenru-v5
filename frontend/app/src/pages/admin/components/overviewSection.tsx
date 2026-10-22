import type { AdminOverview } from 'bagad-client';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarIcon,
  FileIcon,
  KeyRoundIcon,
  LinkIcon,
  ShieldAlertIcon,
  SmartphoneIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminOverview } from '../queries';

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

interface Stat {
  icon: LucideIcon;
  label: string;
  value: (data: AdminOverview) => number;
  detail?: (data: AdminOverview) => string;
  to: string;
}

const STATS: Stat[] = [
  {
    icon: UsersIcon,
    label: 'Membres actifs',
    value: (d) => d.membersActive,
    detail: (d) => plural(d.membersInactive, 'inactif'),
    to: '/admin/members',
  },
  { icon: UsersRoundIcon, label: 'Groupes', value: (d) => d.groups, to: '/admin/groups' },
  { icon: KeyRoundIcon, label: 'Rôles', value: (d) => d.roles, to: '/admin/roles' },
  { icon: WalletIcon, label: 'Adhésions à jour', value: (d) => d.membershipsActiveSeason, to: '/admin/memberships' },
  { icon: LinkIcon, label: 'Adhésions à rattacher', value: (d) => d.unlinkedMemberships, to: '/admin/memberships' },
  {
    icon: SmartphoneIcon,
    label: 'Appareils push',
    value: (d) => d.pushSubscriptions,
    detail: (d) => plural(d.membersWithPush, 'membre'),
    to: '/admin/communication',
  },
  { icon: KeyRoundIcon, label: "Clés d'API actives", value: (d) => d.apiKeysActive, to: '/admin/security' },
  { icon: CalendarIcon, label: 'Évènements', value: (d) => d.events, to: '/events/manage' },
  { icon: FileIcon, label: 'Fichiers', value: (d) => d.files, to: '/files' },
];

interface OverviewAlert {
  key: string;
  title: string;
  description: string;
  to: string;
}

export function buildAlerts(data: AdminOverview): OverviewAlert[] {
  const alerts: OverviewAlert[] = [];
  if (data.membersWithoutCredential > 0) {
    alerts.push({
      key: 'credentials',
      title: `${plural(data.membersWithoutCredential, 'membre')} sans identifiant`,
      description: 'Ni mot de passe ni passkey : ces membres ne peuvent se connecter que par lien e-mail.',
      to: '/admin/security',
    });
  }
  if (data.unlinkedMemberships > 0) {
    alerts.push({
      key: 'unlinked',
      title: `${plural(data.unlinkedMemberships, 'adhésion')} à rattacher`,
      description: 'Des commandes HelloAsso ne correspondent à aucun membre.',
      to: '/admin/memberships',
    });
  }
  return alerts;
}

function StatCard({ stat, data }: { stat: Stat; data: AdminOverview | undefined }) {
  const Icon = stat.icon;
  return (
    <Link
      to={stat.to}
      className="rounded-4xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex items-start gap-4">
          <span className="rounded-2xl bg-primary/15 p-3 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-3xl tabular-nums">
              {data ? stat.value(data) : <Skeleton className="h-9 w-12" />}
            </CardTitle>
            <CardDescription>{stat.label}</CardDescription>
            {data && stat.detail ? (
              <p className="text-xs text-muted-foreground">{stat.detail(data)}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AlertLink({ alert }: { alert: OverviewAlert }) {
  return (
    <Link
      to={alert.to}
      className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Alert>
        <ShieldAlertIcon />
        <AlertTitle>{alert.title}</AlertTitle>
        <AlertDescription>{alert.description}</AlertDescription>
      </Alert>
    </Link>
  );
}

export default function OverviewSection() {
  const { data } = useAdminOverview();
  const alerts = data ? buildAlerts(data) : [];

  return (
    <div className="flex flex-col gap-6">
      {alerts.map((alert) => <AlertLink key={alert.key} alert={alert} />)}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {STATS.map((stat) => <StatCard key={stat.label} stat={stat} data={data} />)}
      </div>
    </div>
  );
}
