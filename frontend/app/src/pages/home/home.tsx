import { ArrowRight, CalendarDays, CircleCheck, FolderOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { FileOrFolderType, type Event, type FileOrFolder, type GlobalStats, type MyStats } from 'bagad-client';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions, useUserProfile } from '../../config/client';
import { cn } from '@/lib/utils';
import { toIsoDate } from '../../utils/date';
import groupBy from '../../utils/groupby';
import Calendar from '../events/components/calendar';
import EventListItem, { EventListItemSkeleton } from '../events/components/event';
import FileItem, { FileItemSkeleton } from '../files/components/file-item';
import Mailbox from './components/mailbox';

const MAX_DISPLAYED_EVENTS = 4;
const LATEST_FILES_COUNT = 5;
const NEXT_EVENTS_FETCH_LIMIT = 10;
const CALENDAR_EVENTS_FETCH_LIMIT = 100;

function ResponseBanner({ myStats, globalStats }: { myStats?: MyStats; globalStats?: GlobalStats }) {
  if (!myStats || !globalStats) return null;
  const pendingCount = globalStats.nUpcomingEvent - myStats.nUpcommingResponses;

  if (pendingCount <= 0) {
    return (
      <div className="mb-8 flex items-center gap-3 surface rounded-3xl px-5 py-4 text-muted-foreground">
        <CircleCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span>Vous avez répondu à toutes les prochaines sorties.</span>
      </div>
    );
  }

  return (
    <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-primary px-6 py-5 text-primary-foreground shadow-surface sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="font-heading text-4xl" aria-hidden="true">{pendingCount}</span>
        <div className="flex flex-col">
          <span className="font-semibold">
            {pendingCount > 1 ? `${pendingCount} sorties attendent votre réponse` : 'Une sortie attend votre réponse'}
          </span>
          <span className="text-sm text-primary-foreground/80">Indiquez votre présence pour aider à préparer les sorties.</span>
        </div>
      </div>
      <Link to="/events" className={cn(buttonVariants({ variant: 'secondary' }), 'shrink-0 self-start sm:self-auto')}>
        Répondre
        <ArrowRight data-icon="inline-end" />
      </Link>
    </div>
  );
}

function SectionLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="whitespace-nowrap underline underline-offset-4 hover:decoration-2">
      {children}
      <ArrowRight className="ml-2 inline" />
    </Link>
  );
}

function NextEventsSection({
  nextEvents, responses, canRespond,
}: {
  nextEvents?: Event[];
  responses?: Map<number, Array<{ value: boolean }>>;
  canRespond: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Prochains évènements</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {nextEvents ? (
          <div className="flex flex-col gap-3">
            {nextEvents.length ? nextEvents.map((event) => (
              <EventListItem
                key={event.id}
                event={event}
                variant="muted"
                response={responses?.get(event.id)?.at(0)?.value}
                showResponse={canRespond}
              />
            )) : (
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
                  <EmptyTitle>Aucun évènement à venir</EmptyTitle>
                  <EmptyDescription>Les prochaines sorties apparaîtront ici.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        ) : <EventListItemSkeleton variant="muted" />}
      </CardContent>
      {canRespond ? (
        <CardFooter>
          <SectionLink to="/events">Répondre aux sorties</SectionLink>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function LatestFilesSection({ files }: { files?: FileOrFolder[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Derniers fichiers ajoutés</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {files ? (
          <div className="flex flex-col gap-3">
            {files.length ? files.map((file) => <FileItem key={file.id} file={file} variant="muted" noAction />) : (
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><FolderOpen /></EmptyMedia>
                  <EmptyTitle>Aucun fichier récent</EmptyTitle>
                  <EmptyDescription>Les derniers fichiers partagés apparaîtront ici.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3"><FileItemSkeleton variant="muted" /><FileItemSkeleton variant="muted" /><FileItemSkeleton variant="muted" /></div>
        )}
      </CardContent>
      <CardFooter>
        <SectionLink to="/files">Accéder aux fichiers</SectionLink>
      </CardFooter>
    </Card>
  );
}

export default function HomePage() {
  const { eventsApi, filesApi, usersApi } = useApiClient();
  const profile = useUserProfile();
  const { can } = usePermissions();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const todayIso = toIsoDate(today);

  const { data: nextEvents } = useQuery({
    queryKey: ['events', 'list', { dateGte: todayIso, limit: NEXT_EVENTS_FETCH_LIMIT }],
    queryFn: async () => await eventsApi.listEventsApiV1EventsGet({ limit: NEXT_EVENTS_FETCH_LIMIT, dateGte: today }),
    select: (data) => data.slice(0, MAX_DISPLAYED_EVENTS),
    enabled: can('view', 'event'),
  });
  const { data: calendarEvents } = useQuery({
    queryKey: ['events', 'list', { dateGte: toIsoDate(monthStart), dateLt: toIsoDate(nextMonthStart), limit: CALENDAR_EVENTS_FETCH_LIMIT }],
    queryFn: async () => await eventsApi.listEventsApiV1EventsGet({
      limit: CALENDAR_EVENTS_FETCH_LIMIT,
      dateGte: monthStart,
      dateLt: nextMonthStart,
    }),
    enabled: can('view', 'event'),
  });
  const { data: files } = useQuery({
    queryKey: ['files', 'latest', { limit: LATEST_FILES_COUNT }],
    queryFn: async () => await filesApi.listFilesApiV1FilesGet({ t: FileOrFolderType.File, limit: LATEST_FILES_COUNT }),
    enabled: can('view', 'file'),
  });
  const { data: responses } = useQuery({
    queryKey: ['responses', 'list', { dateGte: todayIso, userId: profile?.id }],
    queryFn: async () => await eventsApi.listResponsesApiV1ResponsesGet({ dateGte: today, userId: profile?.id }),
    select: (data) => groupBy(data, (event) => event.eventId),
    enabled: can('create', 'response') && !!profile,
  });
  const { data: myStats } = useQuery({
    queryKey: ['stats', 'me'],
    queryFn: async () => await usersApi.getMyStatsApiV1StatsMeGet(),
    enabled: can('create', 'response'),
  });
  const { data: globalStats } = useQuery({
    queryKey: ['stats', 'global'],
    queryFn: async () => await usersApi.getGlobalStatsApiV1StatsGet(),
  });

  const canViewEvents = can('view', 'event');
  const canRespond = can('create', 'response');

  return (
    <>
      <Header
        title={<span lang="br" title={`Bienvenue ${profile?.firstName}`}>{`Degemer mat ${profile?.firstName}`}</span>}
        subtitle="Bienvenue dans votre espace membres"
        actions={can('view', 'email') ? [<Mailbox key="mailbox" />] : []}
      />
      <Container>
        <ResponseBanner myStats={myStats} globalStats={globalStats} />
        <div className="mt-8 grid grid-cols-1 content-stretch gap-8 md:grid-cols-2 lg:grid-cols-3">
          {canViewEvents ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Calendrier</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <Calendar events={calendarEvents ?? []} bare />
              </CardContent>
              <CardFooter>
                <SectionLink to="/events/calendar">Accéder au calendrier</SectionLink>
              </CardFooter>
            </Card>
          ) : null}
          {canViewEvents ? <NextEventsSection nextEvents={nextEvents} responses={responses} canRespond={canRespond} /> : null}
          {can('view', 'file') ? <LatestFilesSection files={files} /> : null}
        </div>
      </Container>
    </>
  );
}
