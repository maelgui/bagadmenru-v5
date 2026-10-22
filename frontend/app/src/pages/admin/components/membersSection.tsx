import type { AdminMember } from 'bagad-client';
import {
  BellOffIcon,
  CirclePlusIcon,
  DownloadIcon,
  FingerprintIcon,
  KeyRoundIcon,
  LockIcon,
  SearchIcon,
  ShieldAlertIcon,
  SmartphoneIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { GroupTag } from '../../profiles/components/groupTag';
import { MembershipStatusPill } from '../../profiles/components/membershipBadge';
import {
  FILTERS,
  type Filter,
  hasCredential,
  isFilter,
  matchesFilter,
  matchesSearch,
  membersToCsv,
} from '../memberUtils';
import { useAdminMembers } from '../queries';

const ISO_DATE_LENGTH = 10;

function downloadCsv(members: AdminMember[]) {
  const blob = new Blob([`\uFEFF${membersToCsv(members)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `membres-${new Date().toISOString().slice(0, ISO_DATE_LENGTH)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function CredentialCell({ member }: { member: AdminMember }) {
  if (!hasCredential(member)) {
    return (
      <Badge variant="destructive">
        <ShieldAlertIcon data-icon="inline-start" />
        Aucun
      </Badge>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      {member.hasPassword ? (
        <Badge variant="outline" title="Mot de passe"><LockIcon data-icon="inline-start" />MDP</Badge>
      ) : null}
      {member.passkeyCount > 0 ? (
        <Badge variant="outline" title={`${member.passkeyCount} passkey(s)`}>
          <FingerprintIcon data-icon="inline-start" />
          {member.passkeyCount}
        </Badge>
      ) : null}
    </span>
  );
}

function MemberRow({ member }: { member: AdminMember }) {
  return (
    <TableRow className={cn(!member.isActive && 'opacity-60')}>
      <TableCell>
        <Link to={`/profile/${member.id}`} className="flex flex-col hover:underline">
          <span className="font-medium">
            {member.firstName} {member.lastName}
            {!member.receivesEmails ? (
              <BellOffIcon className="ml-1 inline size-3 text-destructive" aria-label="Ne reçoit pas les e-mails" />
            ) : null}
          </span>
          <span className="text-xs text-muted-foreground">{member.email}</span>
        </Link>
        {!member.isActive ? <Badge variant="secondary" className="mt-1">Inactif</Badge> : null}
      </TableCell>
      <TableCell>
        <span className="-m-1 flex flex-wrap">
          {member.groups.map((group) => (
            <GroupTag key={group.id} name={group.name} color={group.color} />
          ))}
        </span>
      </TableCell>
      <TableCell>
        <MembershipStatusPill status={member.membershipStatus} season={member.membershipActiveSeason} />
      </TableCell>
      <TableCell><CredentialCell member={member} /></TableCell>
      <TableCell className="tabular-nums">
        <span className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1" title="Appareils push">
            <SmartphoneIcon className="size-3.5" aria-hidden="true" />
            {member.pushSubscriptionCount}
            <span className="sr-only">appareils push</span>
          </span>
          <span className="flex items-center gap-1" title="Clés d'API">
            <KeyRoundIcon className="size-3.5" aria-hidden="true" />
            {member.apiKeyCount}
            <span className="sr-only">clés d&apos;API</span>
          </span>
        </span>
      </TableCell>
      <TableCell className="text-right">
        <Link
          to={`/profile/edit/${member.id}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          aria-label={`Modifier ${member.firstName} ${member.lastName}`}
        >
          Modifier
        </Link>
      </TableCell>
    </TableRow>
  );
}

export default function MembersSection() {
  const { data: members } = useAdminMembers();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => (members ?? []).filter((m) => matchesFilter(m, filter) && matchesSearch(m, search)),
    [members, filter, search],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membres</CardTitle>
        <CardDescription>
          Tous les comptes, y compris inactifs, avec leur adhésion et leurs moyens de connexion.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={!members} onClick={() => downloadCsv(filtered)}>
            <DownloadIcon data-icon="inline-start" />
            Exporter (CSV)
          </Button>
          <Link to="/profile/add" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <CirclePlusIcon data-icon="inline-start" />
            Ajouter
          </Link>
          <Link to="/profile/invite" className={cn(buttonVariants({ size: 'sm' }))}>
            <UserPlusIcon data-icon="inline-start" />
            Inviter
          </Link>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <ToggleGroup
            value={[filter]}
            onValueChange={(value) => {
              const next = value.find(isFilter);
              if (next) setFilter(next);
            }}
            aria-label="Filtrer les membres"
            variant="outline"
            size="sm"
            className="flex-wrap"
          >
            {FILTERS.map((f) => (
              <ToggleGroupItem key={f.value} value={f.value}>{f.label}</ToggleGroupItem>
            ))}
          </ToggleGroup>
          <InputGroup className="lg:w-72">
            <InputGroupAddon><SearchIcon /></InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Rechercher un membre"
              aria-label="Rechercher un membre"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        {!members ? <Skeleton className="h-64 w-full" /> : null}

        {members && filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
              <EmptyTitle>Aucun membre</EmptyTitle>
              <EmptyDescription>Aucun membre ne correspond à ce filtre.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        {filtered.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Groupes</TableHead>
                <TableHead>Adhésion</TableHead>
                <TableHead>Identifiants</TableHead>
                <TableHead>Appareils</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => <MemberRow key={member.id} member={member} />)}
            </TableBody>
          </Table>
        ) : null}

        {members ? (
          <p className="text-xs text-muted-foreground">
            {filtered.length} membre{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''} sur {members.length}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
