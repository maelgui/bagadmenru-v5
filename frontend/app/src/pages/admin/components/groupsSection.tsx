import type { Group } from 'bagad-client';
import { CirclePlus, Pen, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
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
import { GroupTag } from '../../profiles/components/groupTag';
import { useGroups } from '../queries';

function GroupRow({ group }: { group: Group }) {
  return (
    <TableRow>
      <TableCell>
        <Link to={`/groups/${group.id}`} className="font-medium hover:underline">
          <GroupTag name={group.name} color={group.color} />
        </Link>
        <span className="flex flex-wrap gap-1 pl-1">
          {group.isInstrument ? <Badge variant="outline">Pupitre</Badge> : null}
          {group.isDefault ? <Badge variant="outline">Par défaut</Badge> : null}
        </span>
      </TableCell>
      <TableCell className="tabular-nums">{group.members.length}</TableCell>
      <TableCell>
        {group.roles.length ? (
          <span className="flex flex-wrap gap-1">
            {group.roles.map((role) => (
              <Badge key={role.id} variant="secondary">{role.id}</Badge>
            ))}
          </span>
        ) : <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {group.mailingList ? `${group.mailingList}@bagadmenru.bzh` : <span className="font-sans text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-right">
        <Link
          to={`/groups/edit/${group.id}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          aria-label={`Modifier le groupe ${group.name}`}
        >
          <Pen data-icon="inline-start" />
          Modifier
        </Link>
      </TableCell>
    </TableRow>
  );
}

export default function GroupsSection() {
  const { data: groups } = useGroups();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Groupes</CardTitle>
        <CardDescription>
          Les groupes portent les rôles (donc les permissions) et les mailing lists. Un membre
          hérite des rôles de tous ses groupes.
        </CardDescription>
        <CardAction>
          <Link to="/groups/add" className={cn(buttonVariants({ size: 'sm' }))}>
            <CirclePlus data-icon="inline-start" />
            Ajouter
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!groups ? <Skeleton className="h-40 w-full" /> : null}
        {groups?.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><UsersRound /></EmptyMedia>
              <EmptyTitle>Aucun groupe</EmptyTitle>
              <EmptyDescription>Créez un premier groupe pour organiser les membres.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {groups && groups.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Groupe</TableHead>
                <TableHead>Membres</TableHead>
                <TableHead>Rôles</TableHead>
                <TableHead>Mailing list</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => <GroupRow key={group.id} group={group} />)}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
