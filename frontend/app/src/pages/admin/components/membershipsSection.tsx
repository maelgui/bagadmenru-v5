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
import { MemberIdentity } from './memberIdentity';
import { Stat, StatTile } from './stats';

const STATUS_ORDER: MembershipStatus[] = [
  MembershipStatus.Active,
  MembershipStatus.Expired,
  MembershipStatus.None,
];

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
        <Stat value={count} label={`commande${(count ?? 0) > 1 ? 's' : ''} en attente`} />
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
            <TableCell><MemberIdentity member={member} /></TableCell>
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
            <StatTile
              key={status}
              icon={MEMBERSHIP_META[status].icon}
              label={MEMBERSHIP_META[status].label}
              className={MEMBERSHIP_META[status].className}
              value={active?.filter((m) => m.membershipStatus === status).length}
            />
          ))}
        </CardContent>
      </Card>

      <UnlinkedCard />
      <FollowUpCard members={active} />
    </div>
  );
}
