import { CalendarDays, CalendarPlus, Info } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions } from '../../config/client';
import env from '../../env';
import { toIsoDate } from '../../utils/date';
import groupBy from '../../utils/groupby';
import Calendar from './components/calendar';
import CalendarSyncDialog from './components/calendarSyncDialog';
import EventListItem from './components/event';
import DisplaySelector from './components/selector';

const EVENTS_FETCH_LIMIT = 100;

// RBAC permission the authenticated ICS feed requires (view:calendar). A
// "Calendrier" key is scoped to exactly this, so it can subscribe to the feed
// but do nothing else. Matches Resource.CALENDAR in the backend.
const CALENDAR_PERMISSION = 'view:calendar';

function getStartDate() {
  const startDate = new Date();
  startDate.setDate(1);
  return startDate;
}

export default function CalendarPage() {
  const startDate = getStartDate();
  const { eventsApi, usersApi } = useApiClient();
  const { can } = usePermissions();
  const { data } = useQuery({
    queryKey: ['events', 'list', { dateGte: toIsoDate(startDate), limit: EVENTS_FETCH_LIMIT }],
    queryFn: async () => await eventsApi.listEventsApiV1EventsGet({ limit: EVENTS_FETCH_LIMIT, dateGte: startDate }),
    select: (response) => ({
      events: response,
      eventsByMonth: groupBy(response, (item) => item.date.getMonth()),
    }),
  });

  const [monthOffset, setMonthOffset] = useState(0);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const currentMonth = new Date(startDate.getFullYear(), startDate.getMonth() + monthOffset).toLocaleString('fr', { month: 'long', year: 'numeric' });

  // The personal ICS link is only known after a key is minted (its raw secret
  // is returned once, at creation). Opening the sync dialog mints a dedicated
  // "Calendrier" API key on demand; closing it clears the link so re-opening
  // always issues a fresh one.
  const {
    mutate: mintLink,
    data: minted,
    isPending: isMinting,
    isError: mintFailed,
    reset: resetMint,
  } = useMutation({
    mutationFn: async () => await usersApi.createMyApiKeyApiV1ProfilesMeApiKeysPost({
      apiKeyCreate: { label: 'Calendrier', authorizedPermissions: [CALENDAR_PERMISSION] },
    }),
  });

  const icsUrl = minted
    ? `${env.VITE_BBE2_API_URL}/api/v1/events/export/ics/me?api_key=${minted.key}`
    : null;

  const openSync = () => {
    resetMint();
    mintLink();
    setIsSyncOpen(true);
  };

  const onSyncOpenChange = (open: boolean) => {
    setIsSyncOpen(open);
    if (!open) {
      resetMint();
    }
  };

  return (
    <>
      <Header
        title="Calendrier"
        subtitle={currentMonth}
        actions={[
          <Link key="add-event" to="/events/manage" className={cn(buttonVariants({ variant: 'outline' }), can('edit', 'event') ? '' : 'hidden')}>
            <CalendarPlus data-icon="inline-start" />
            Gérer
          </Link>,
          <DisplaySelector key="doodle-nav" />,
        ]}
        breadcrumb={[{ title: 'Évènements', link: can('view', 'response') ? '/events' : undefined }, { title: 'Calendrier' }]}
      />
      <Container>
        <Alert className="mb-8">
          <Info />
          <AlertDescription>
            <p className="pb-4 font-semibold">Synchronisation du calendrier</p>
            <p className="pb-4">
              Ajoutez les sorties et répétitions à l&apos;application de calendrier de votre téléphone ou de votre ordinateur.
            </p>
            <Button variant="ghost" onClick={openSync}>
              <CalendarDays data-icon="inline-start" />
              Ajouter à mon agenda
            </Button>
          </AlertDescription>
        </Alert>
        <Card>
          <CardContent>
            <div className="flex flex-col gap-8 lg:flex-row">
              <div className="basis-2/3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setMonthOffset(monthOffset - 1)}>précédent</Button>
                    <Button variant="outline" size="icon" onClick={() => setMonthOffset(0)} aria-label="Aujourd'hui" title="Aujourd'hui">
                      <CalendarDays />
                    </Button>
                    <Button variant="outline" onClick={() => setMonthOffset(monthOffset + 1)}>suivant</Button>
                  </div>
                  <div className="font-semibold text-foreground uppercase">{currentMonth}</div>
                </div>
                <Calendar events={data?.events ?? []} monthOffset={monthOffset} displayContent bare />
              </div>
              <div className="basis-1/3 overflow-hidden">
                {data && !data.events.length ? (
                  <Alert>
                    <Info />
                    <AlertDescription>Aucun évènement à venir.</AlertDescription>
                  </Alert>
                ) : null}
                {Array.from(data?.eventsByMonth ?? []).map(([month, events]) => (
                  <div key={month} className="mb-4">
                    <h3 className="text-center font-bold capitalize">{new Date(startDate.getFullYear(), month).toLocaleString('fr', { month: 'long' })}</h3>
                    {events.map((event) => (
                      <div className="mt-2 mb-4" key={event.id}>
                        <EventListItem event={event} variant="muted" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
      <CalendarSyncDialog
        open={isSyncOpen}
        onOpenChange={onSyncOpenChange}
        icsUrl={icsUrl}
        isPending={isMinting}
        isError={mintFailed}
      />
    </>
  );
}
