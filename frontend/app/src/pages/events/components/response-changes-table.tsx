import { ArrowRight, CircleCheck, CircleHelp, CircleX } from 'lucide-react';
import type { ResponseChange } from 'bagad-client';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import EventCategories from '../../../utils/event-category';

function PresenceIcon({ value }: { value: boolean | null }) {
  if (value === true) return <CircleCheck className="size-4 text-emerald-500" aria-label="Présent" />;
  if (value === false) return <CircleX className="size-4 text-destructive" aria-label="Absent" />;
  return <CircleHelp className="size-4 text-sky-500" aria-label="Sans réponse" />;
}

function Transition({ change }: { change: ResponseChange }) {
  return (
    <span className="flex items-center gap-1.5">
      <PresenceIcon value={change.fromValue} />
      <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
      <PresenceIcon value={change.toValue} />
    </span>
  );
}

function MemberLink({ change }: { change: ResponseChange }) {
  return (
    <Link
      to={`/profile/${change.user.id}`}
      className="flex min-w-0 items-center gap-3 hover:underline"
    >
      <Avatar size="sm" className="shrink-0">
        <AvatarFallback>
          {`${change.user.firstName[0]}${change.user.lastName[0]}`.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">
        {change.user.firstName}
        {' '}
        {change.user.lastName}
      </span>
    </Link>
  );
}

function EventCell({ change }: { change: ResponseChange }) {
  const category = EventCategories[change.event.category];
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{change.event.title}</span>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge className={category?.className} variant={category?.variant ?? 'default'}>
          {category?.name ?? change.event.category}
        </Badge>
        <span>
          {change.event.date.toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
}

function formatChangedAt(change: ResponseChange): string {
  return change.changedAt.toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function ResponseChangesTable({
  changes,
  showChange,
}: {
  changes: ResponseChange[];
  showChange: boolean;
}) {
  return (
    <>
      <div className="hidden surface rounded-4xl p-2 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full max-w-0">Membre</TableHead>
              <TableHead>Évènement</TableHead>
              {showChange ? <TableHead>Changement</TableHead> : null}
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {changes.map((change) => (
              <TableRow key={change.id}>
                <TableCell className="w-full max-w-0">
                  <MemberLink change={change} />
                </TableCell>
                <TableCell>
                  <EventCell change={change} />
                </TableCell>
                {showChange ? (
                  <TableCell>
                    <Transition change={change} />
                  </TableCell>
                ) : null}
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatChangedAt(change)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {changes.map((change) => (
          <li key={change.id} className="surface rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <MemberLink change={change} />
              {showChange ? <Transition change={change} /> : null}
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <EventCell change={change} />
              <span className="shrink-0 text-sm text-muted-foreground">
                {formatChangedAt(change)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
