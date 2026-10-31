import { Edit3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Event } from 'bagad-client';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions } from '../../config/client';
import { EventBadgeRow } from './components/event';
import {
  enrichResponses,
  instrumentsOf,
  MyResponseBlock,
  ParticipantsBlock,
  useEventResponsesSummary,
} from './components/responses';
import {
  eventQuery, eventResponsesQuery, upcomingResponsesQuery, useRespondMutation,
} from './queries';

function longDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function EventResponses({ event, canRespond }: { event: Event; canRespond: boolean }) {
  const { eventsApi, usersApi } = useApiClient();
  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => await usersApi.listProfilesApiV1ProfilesGet(),
  });
  const { data: responses } = useQuery(eventResponsesQuery(eventsApi, event.id));
  // Same population as the planning page: members who take part in the
  // doodle (at least one upcoming answer), so the response rate is comparable.
  const { data: upcomingResponses } = useQuery(upcomingResponsesQuery(eventsApi));

  const { enrichedResponses, participants, instruments } = useMemo(() => {
    const all = profiles ?? [];
    const upcoming = upcomingResponses ?? [];
    return {
      enrichedResponses: enrichResponses(responses ?? [], all),
      participants: all.filter((profile) => upcoming.some((response) => response.userId === profile.id)),
      instruments: instrumentsOf(all),
    };
  }, [profiles, responses, upcomingResponses]);
  const { myResponse } = useEventResponsesSummary(enrichedResponses, instruments);
  const mutation = useRespondMutation();

  return (
    <>
      <ParticipantsBlock
        event={event}
        responses={enrichedResponses}
        instruments={instruments}
        profiles={participants}
        totalMembers={participants.length}
      />
      {canRespond ? (
        <MyResponseBlock
          myResponse={myResponse}
          isSaving={mutation.isPending}
          pendingValue={mutation.isPending ? mutation.variables.value : undefined}
          onAnswer={async (value) => await mutation.mutateAsync({ eventId: event.id, value })}
        />
      ) : null}
    </>
  );
}

function EventDetails({ event }: { event: Event }) {
  const { can } = usePermissions();
  const canSeeResponses = can('view', 'response') && can('view', 'profile');
  return (
    <div className="surface rounded-4xl p-6">
      <EventBadgeRow event={event} showResponse={false} />
      <p className="mt-4 whitespace-pre-line">{event.description || 'Pas de description'}</p>
      {canSeeResponses && event.isInDoodle ? (
        <EventResponses event={event} canRespond={can('create', 'response')} />
      ) : null}
    </div>
  );
}

function EditAction({ event }: { event: Event }) {
  const { can } = usePermissions();
  if (!can('edit', 'event')) return null;
  return (
    <Link to={`/events/edit/${event.id}`} className={buttonVariants({ variant: 'outline' })}>
      <Edit3 data-icon="inline-start" />
      Modifier
    </Link>
  );
}

export default function ShowEventPage() {
  const { eventsApi } = useApiClient();
  const { can } = usePermissions();
  const { eventId } = useParams<'eventId'>();
  if (!eventId) throw new Error('No event id');
  const { data: event } = useQuery(eventQuery(eventsApi, parseInt(eventId, 10)));

  return (
    <>
      <Header
        title={event?.title ?? <Skeleton className="h-10 w-64" />}
        subtitle={event ? longDate(event.date) : undefined}
        actions={event ? [<EditAction key="edit" event={event} />] : []}
        breadcrumb={[
          { title: 'Évènements', link: can('view', 'response') ? '/events' : '/events/calendar' },
          { title: event?.title ?? '…' },
        ]}
      />
      <Container>
        {event ? <EventDetails event={event} /> : <Skeleton className="h-48 w-full rounded-4xl" />}
      </Container>
    </>
  );
}
