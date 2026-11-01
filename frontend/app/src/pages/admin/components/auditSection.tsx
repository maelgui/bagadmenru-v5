import { AuditKind, type AuditEvent } from 'bagad-client';
import {
  GlobeIcon, MousePointerClickIcon, ScrollTextIcon, SearchIcon, ServerIcon, ZapIcon,
} from 'lucide-react';
import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,
} from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useDebounced } from '../../../utils/useDebounced';
import {
  isPeriod, isScope, KIND_LABELS, outcomeOf, PERIODS, type Period, periodSince, SCOPES,
  type Scope, scopeParams, shownPath, statusTone,
} from '../auditUtils';
import { useAdminAudit, useAdminMembers } from '../queries';
import { MemberIdentity } from './memberIdentity';

const SEARCH_DEBOUNCE_MS = 300;

const KIND_ICON = {
  [AuditKind.ApiCall]: ServerIcon,
  [AuditKind.PageView]: GlobeIcon,
  [AuditKind.Click]: MousePointerClickIcon,
  [AuditKind.Action]: ZapIcon,
} as const;

const TONE_CLASS = {
  ok: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'client-error': 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  'server-error': 'bg-destructive/10 text-destructive',
} as const;

function KindBadge({ kind }: { kind: AuditKind }) {
  const Icon = KIND_ICON[kind];
  return (
    <Badge variant="outline">
      <Icon data-icon="inline-start" />
      {KIND_LABELS[kind]}
    </Badge>
  );
}

function StatusBadge({ status }: { status: number }) {
  return (
    <Badge className={cn('tabular-nums', TONE_CLASS[statusTone(status)])}>{status}</Badge>
  );
}

function EventRow({ event }: { event: AuditEvent }) {
  const at = DateTime.fromJSDate(event.at).setLocale('fr');
  const path = shownPath(event);
  const outcome = outcomeOf(event);
  return (
    <TableRow data-audit-id={event.id}>
      <TableCell className="whitespace-normal align-top">
        <span className="flex flex-col gap-1">
          <time
            className="whitespace-nowrap tabular-nums text-muted-foreground"
            dateTime={at.toISO() ?? undefined}
            title={at.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)}
          >
            {at.toFormat('dd/MM HH:mm:ss')}
          </time>
          {event.actor ? (
            <MemberIdentity member={event.actor} />
          ) : (
            <span className="text-muted-foreground">Anonyme</span>
          )}
        </span>
      </TableCell>
      <TableCell className="whitespace-normal align-top">
        <span className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <KindBadge kind={event.kind} />
            <span className={cn('break-all', event.kind === AuditKind.ApiCall && 'font-mono text-xs')}>
              {event.name}
            </span>
            {event.status != null ? <StatusBadge status={event.status} /> : null}
            {event.durationMs != null ? (
              <span className="text-xs tabular-nums text-muted-foreground">{Math.round(event.durationMs)} ms</span>
            ) : null}
            {outcome ? <Badge variant="secondary">{outcome}</Badge> : null}
          </span>
          {path ? (
            <span className="break-all font-mono text-xs text-muted-foreground">{path}</span>
          ) : null}
        </span>
      </TableCell>
    </TableRow>
  );
}

export default function AuditSection() {
  const { data: members } = useAdminMembers();
  const [scope, setScope] = useState<Scope>('all');
  const [period, setPeriod] = useState<Period>('7d');
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  // The journal is queried on the server, so the search box is debounced.
  const q = useDebounced(search.trim(), SEARCH_DEBOUNCE_MS);

  // `since` is derived once per period change, not per render, so the query
  // key stays stable while the page is open.
  const since = useMemo(() => periodSince(period), [period]);
  const filters = useMemo(() => ({
    ...scopeParams(scope),
    since,
    userId: userId || undefined,
    q: q || undefined,
  }), [scope, since, userId, q]);

  const {
    data, isPending, isFetchingNextPage, hasNextPage, fetchNextPage,
  } = useAdminAudit(filters);
  const events = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal d&apos;activité</CardTitle>
        <CardDescription>
          Toutes les actions des membres : appels à l&apos;API (modifications incluses), pages
          vues, clics et actions du navigateur (clé d&apos;accès, notifications). Les appels API
          sont conservés un an, le reste 90 jours.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <ToggleGroup
            value={[scope]}
            onValueChange={(value) => {
              const next = value.find(isScope);
              if (next) setScope(next);
            }}
            aria-label="Type d'action"
            variant="outline"
            size="sm"
            className="flex-wrap"
          >
            {SCOPES.map((s) => (
              <ToggleGroupItem key={s.value} value={s.value}>{s.label}</ToggleGroupItem>
            ))}
          </ToggleGroup>
          <NativeSelect
            aria-label="Période"
            value={period}
            onChange={(e) => {
              if (isPeriod(e.target.value)) setPeriod(e.target.value);
            }}
            className="lg:w-40"
          >
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </NativeSelect>
          <NativeSelect
            aria-label="Membre"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="lg:w-56"
          >
            <option value="">Tous les membres</option>
            {(members ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
            ))}
          </NativeSelect>
          <InputGroup className="lg:ml-auto lg:w-72">
            <InputGroupAddon><SearchIcon /></InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Rechercher"
              aria-label="Rechercher une action ou un chemin"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        {isPending ? <Skeleton className="h-64 w-full" /> : null}

        {!isPending && events.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><ScrollTextIcon /></EmptyMedia>
              <EmptyTitle>Aucune action</EmptyTitle>
              <EmptyDescription>Aucune action ne correspond à ces filtres.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        {events.length > 0 ? (
          <>
            {/* Fixed layout: the action column wraps instead of scrolling off a phone screen. */}
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40 sm:w-52">Quand, qui</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => <EventRow key={event.id} event={event} />)}
              </TableBody>
            </Table>
            {hasNextPage ? (
              <Button
                variant="outline"
                className="self-center"
                disabled={isFetchingNextPage}
                onClick={() => { void fetchNextPage(); }}
              >
                {isFetchingNextPage ? 'Chargement…' : 'Afficher plus'}
              </Button>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
