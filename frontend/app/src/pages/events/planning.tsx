import { CalendarPlus, Sparkles, TriangleAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Event, MinimalGroup, Profile } from 'bagad-client';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions, useUserProfile } from '../../config/client';
import {
  type EnrichedResponse,
  groupResponsesByEventAndEnrichUser,
  instrumentsOf,
  MyResponseBlock,
  ParticipantsBlock,
  useEventResponsesSummary,
} from './components/responses';
import DisplaySelector from './components/selector';
import IcsExportButton from './components/ics-export';
import { upcomingDoodleEventsQuery, upcomingResponsesQuery, useRespondMutation } from './queries';

function EventCard({
  event, responses, instruments, profiles, totalMembers,
}: { event: Event; responses: EnrichedResponse[]; instruments: MinimalGroup[]; profiles: Profile[]; totalMembers: number }) {
  const { myResponse } = useEventResponsesSummary(responses, instruments);
  const mutation = useRespondMutation();

  return (
    <div className="overflow-hidden surface rounded-4xl">
      <div className="flex flex-col justify-center border-b border-border/70 bg-primary/5 p-6 text-center">
        <span className="text-sm text-muted-foreground capitalize">{event.date.toLocaleString('fr', { weekday: 'long' })}</span>
        <span className="font-heading text-3xl text-primary">{event.date.getDate()}</span>
        <span className="text-sm text-muted-foreground uppercase">{event.date.toLocaleString('fr', { month: 'long' })}</span>
      </div>
      <div className="p-4">
        <h3 className="pb-1 font-semibold">
          <Link to={`/events/${event.id}`} className="hover:underline">{event.title}</Link>
        </h3>
        <div className="text-sm">{event.description}</div>
        <ParticipantsBlock
          event={event}
          responses={responses}
          instruments={instruments}
          profiles={profiles}
          totalMembers={totalMembers}
        />
        <MyResponseBlock
          myResponse={myResponse}
          isSaving={mutation.isPending}
          pendingValue={mutation.isPending ? mutation.variables.value : undefined}
          onAnswer={async (value) => await mutation.mutateAsync({ eventId: event.id, value })}
        />
      </div>
    </div>
  );
}

export default function PlanningPage() {
  const { usersApi, eventsApi } = useApiClient();
  const { can } = usePermissions();
  const { data: events } = useQuery(upcomingDoodleEventsQuery(eventsApi));
  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: async () => await usersApi.listProfilesApiV1ProfilesGet() });
  const { data: responses } = useQuery(upcomingResponsesQuery(eventsApi));

  const { filteredProfiles, enrichedResponses } = useMemo(() => ({
    filteredProfiles: profiles?.filter((profile) => responses?.find((response) => response.userId === profile.id)) ?? [],
    enrichedResponses: groupResponsesByEventAndEnrichUser(responses ?? [], profiles ?? []),
  }), [profiles, responses]);

  const myProfile = useUserProfile();
  const hasNeverAnswered = myProfile !== undefined && !(responses ?? []).some((response) => response.userId === myProfile.id);

  const instruments = useMemo(() => instrumentsOf(profiles ?? []), [profiles]);

  return (
    <>
      <Header
        title="Planning"
        subtitle="Mes présences aux évènements du groupe"
        actions={[
          <Link key="add-event" to="/events/manage" className={cn(buttonVariants({ variant: 'outline' }), can('edit', 'event') ? '' : 'hidden')}>
            <CalendarPlus data-icon="inline-start" />
            Gérer
          </Link>,
          <IcsExportButton key="ics-export" />,
          <DisplaySelector key="doodle-nav" />,
        ]}
        breadcrumb={[{ title: 'Évènements', link: '/events' }, { title: 'Planning' }]}
      />
      <Container>
        <Alert className="mb-8">
          <Sparkles />
          <AlertDescription>
            <p className="pb-4 font-semibold">Nouvelle vue sur mobile</p>
            <p className="pb-4">Pour une meilleure expérience sur mobile, cette page a été ajoutée. Elle remplace le grand tableau des présences, difficile à remplir sur petits écrans.</p>
            <p className="pb-4"><strong className="font-semibold">Vous préfériez le tableau ?</strong><br />Pas de panique, il est toujours disponible grâce au bouton ci-dessous.</p>
            <Link className={buttonVariants({ variant: 'ghost' })} to="/events/?noRedirect=true">
              <Sparkles data-icon="inline-start" />
              Accéder au tableau
            </Link>
          </AlertDescription>
        </Alert>
        {hasNeverAnswered ? (
          <Alert className="mb-8 border-amber-500/50 text-amber-700 dark:text-amber-400 [&>svg]:text-current">
            <TriangleAlert />
            <AlertTitle>Vous n&apos;apparaissez pas encore dans les sondages</AlertTitle>
            <AlertDescription>
              <p>
                Tant que vous n&apos;avez répondu à aucun évènement, vous n&apos;êtes pas
                comptabilisé dans les participations.
              </p>
              <p>
                Dès que vous répondez à un premier évènement de la saison, vous vous engagez à
                répondre à <strong className="font-semibold">tous</strong> les évènements - que ce
                soit oui ou non. Le but est simplement d&apos;avoir votre réponse.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events?.map((event) => <EventCard key={event.id} event={event} responses={enrichedResponses.get(event.id) ?? []} instruments={instruments} profiles={filteredProfiles} totalMembers={filteredProfiles.length} />)}
        </div>
      </Container>
    </>
  );
}
