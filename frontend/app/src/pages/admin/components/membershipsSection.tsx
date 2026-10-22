import type { AdminMember } from 'bagad-client';
import { MembershipStatus } from 'bagad-client';
import { LinkIcon, WalletIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { MEMBERSHIP_META, MembershipStatusPill } from '../../profiles/components/membershipBadge';
import { currentSeasonLabel, useAdminMembers, useUnlinkedMemberships } from '../queries';

const STATUS_ORDER: MembershipStatus[] = [
  MembershipStatus.Active,
  MembershipStatus.Expired,
  MembershipStatus.None,
];

function StatusCount({ status, count }: { status: MembershipStatus; count: number | undefined }) {
  const meta = MEMBERSHIP_META[status];
  const Icon = meta.icon;
  return (
    <div className={cn('flex items-center gap-3 rounded-3xl p-4', meta.className)}>
      <Icon className="size-6 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-2xl font-semibold tabular-nums">
          {count === undefined ? <Skeleton className="h-8 w-10" /> : count}
        </p>
        <p className="text-sm">{meta.label}</p>
      </div>
    </div>
  );
}

function UnlinkedCard() {
  const { data: unlinked } = useUnlinkedMemberships();
  const count = unlinked?.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Commandes à rattacher</CardTitle>
        <CardDescription>
          Adhésions reçues dont l&apos;e-mail ne correspond à aucun membre. Elles sont supprimées
          automatiquement au bout de quelques semaines si elles ne sont pas rattachées.
        </CardDescription>
        <CardAction>
          <Link to="/profile/membership/reconciliation" className={cn(buttonVariants({ size: 'sm' }))}>
            <LinkIcon data-icon="inline-start" />
            Rattacher
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">
          {count === undefined ? <Skeleton className="h-9 w-12" /> : count}
        </p>
        <p className="text-sm text-muted-foreground">commande{(count ?? 0) > 1 ? 's' : ''} en attente</p>
      </CardContent>
    </Card>
  );
}

function FollowUpTable({ members }: { members: AdminMember[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Membre</TableHead>
          <TableHead>Pupitre</TableHead>
          <TableHead>Adhésion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <Link to={`/profile/${member.id}`} className="flex flex-col hover:underline">
                <span className="font-medium">{member.firstName} {member.lastName}</span>
                <span className="text-xs text-muted-foreground">{member.email}</span>
              </Link>
            </TableCell>
            <TableCell>{member.instrument?.name ?? '—'}</TableCell>
            <TableCell>
              <MembershipStatusPill status={member.membershipStatus} season={member.membershipActiveSeason} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FollowUpCard({ members }: { members: AdminMember[] | undefined }) {
  const toFollowUp = members?.filter((m) => m.membershipStatus !== MembershipStatus.Active);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Membres à relancer</CardTitle>
        <CardDescription>Membres actifs dont l&apos;adhésion n&apos;est pas à jour cette saison.</CardDescription>
      </CardHeader>
      <CardContent>
        {!toFollowUp ? <Skeleton className="h-32 w-full" /> : null}
        {toFollowUp?.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><WalletIcon /></EmptyMedia>
              <EmptyTitle>Tout le monde est à jour</EmptyTitle>
              <EmptyDescription>Aucun membre actif sans adhésion valide.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {toFollowUp && toFollowUp.length > 0 ? <FollowUpTable members={toFollowUp} /> : null}
      </CardContent>
    </Card>
  );
}

export default function MembershipsSection() {
  const { data: members } = useAdminMembers();
  const active = members?.filter((m) => m.isActive);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Saison {currentSeasonLabel()}</CardTitle>
          <CardDescription>
            Adhésions des membres actifs, calculées à partir des commandes HelloAsso et du Cercle
            Montfortais.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STATUS_ORDER.map((status) => (
            <StatusCount
              key={status}
              status={status}
              count={active?.filter((m) => m.membershipStatus === status).length}
            />
          ))}
        </CardContent>
      </Card>

      <UnlinkedCard />
      <FollowUpCard members={active} />
    </div>
  );
}
