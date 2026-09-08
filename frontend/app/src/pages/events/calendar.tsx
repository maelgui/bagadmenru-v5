import { CalendarDays, CalendarPlus, Info, Link2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions } from '../../config/client';
import env from '../../env';
import { toIsoDate } from '../../utils/date';
import groupBy from '../../utils/groupby';
import Calendar from './components/calendar';
import EventListItem from './components/event';
import DisplaySelector from './components/selector';

const EVENTS_FETCH_LIMIT = 100;

// OpenAPI operation id of the authenticated per-member ICS feed
// (GET /events/export/ics/me). Matches the backend allowlist
// (bbe2.utils.api_operations.EXPORT_ICS_ME).
const EXPORT_ICS_ME_OPERATION = 'ExportIcsMe';

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
  const currentMonth = new Date(startDate.getFullYear(), startDate.getMonth() + monthOffset).toLocaleString('fr', { month: 'long', year: 'numeric' });

  // The personalised ICS link is only known after a key is generated: the raw
  // secret is returned once at creation and never again. Requesting the link
  // therefore creates a dedicated "Calendrier" API key on demand.
  const [icsUrl, setIcsUrl] = useState<string | null>(null);

  const { mutate: generateLink, isPending: isGenerating } = useMutation({
    mutationFn: async () => await usersApi.createMyApiKeyApiV1ProfilesMeApiKeysPost({
      apiKeyCreate: { label: 'Calendrier', authorizedOperations: [EXPORT_ICS_ME_OPERATION] },
    }),
    onSuccess: (created) => {
      setIcsUrl(`${env.VITE_BBE2_API_URL}/api/v1/events/export/ics/me?api_key=${created.key}`);
    },
    onError: () => {
      toast.add({ title: 'La génération du lien a échoué.', type: 'error' });
    },
  });

  const googleCalendarUrl = icsUrl
    ? `https://www.google.com/calendar/render?cid=${icsUrl.replace('https://', 'webcal://')}`
    : null;

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
              Vous pouvez synchroniser le calendrier du site avec votre propre application de calendrier. Les dates de sorties et de répétitions affichées ici peuvent ainsi s&apos;ajouter automatiquement dans votre calendrier !
            </p>
            {icsUrl ? (
              <>
                <p className="pb-4">
                  Voici votre lien personnel de synchronisation. Il contient une clé d&apos;accès à votre nom (visible et révocable dans
                  {' '}
                  <Link to="/profile/settings/api" className="underline underline-offset-2">Paramètres › Accès API</Link>
                  {' '}
                  sous le nom « Calendrier ») : ne le partagez pas.
                </p>
                <code className="mb-4 block w-full overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs break-all">
                  {icsUrl}
                </code>
                <div className="flex flex-wrap gap-2">
                  {googleCalendarUrl ? (
                    <Link className={buttonVariants({ variant: 'ghost' })} to={googleCalendarUrl}>
                      <CalendarDays data-icon="inline-start" />
                      Google Agenda
                    </Link>
                  ) : null}
                  <CopyButton value={icsUrl} label="Copier le lien ICS" icon={CalendarDays} variant="ghost" />
                </div>
              </>
            ) : (
              <Button variant="ghost" onClick={() => generateLink()} disabled={isGenerating}>
                {isGenerating ? <Spinner data-icon="inline-start" /> : <Link2 data-icon="inline-start" />}
                Générer mon lien de synchronisation
              </Button>
            )}
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
    </>
  );
}
