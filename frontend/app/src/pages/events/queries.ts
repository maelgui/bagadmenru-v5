import { queryOptions, useMutation } from '@tanstack/react-query';
import type { EventsApi } from 'bagad-client';
import { toast } from '@/components/ui/toast';
import { queryClient, useApiClient } from '../../config/client';
import { toIsoDate } from '../../utils/date';

const EVENTS_FETCH_LIMIT = 100;

/**
 * One event by id, shared by the event page and anything deep-linking to it.
 */
export function eventQuery(eventsApi: EventsApi, eventId: number) {
  return queryOptions({
    queryKey: ['events', eventId],
    queryFn: async () => await eventsApi.getEventApiV1EventsEventIdGet({ eventId }),
  });
}

/**
 * Every response to one event (all members), for the event page.
 */
export function eventResponsesQuery(eventsApi: EventsApi, eventId: number) {
  return queryOptions({
    queryKey: ['responses', 'list', { eventId }],
    queryFn: async () => await eventsApi.listResponsesApiV1ResponsesGet({ eventId }),
  });
}

/**
 * Records the current member's answer to an event. Single owner of the
 * "réponse enregistrée" feedback, shared by the doodle, planning and event pages.
 */
export function useRespondMutation() {
  const { eventsApi } = useApiClient();
  return useMutation({
    mutationFn: async ({ eventId, value }: { eventId: number; value: boolean }) => (
      await eventsApi.createResponseApiV1EventsEventIdResponsesPut({ eventId, responseCreate: { value } })
    ),
    onSettled: async () => await queryClient.invalidateQueries({ queryKey: ['responses'] }),
    onSuccess: () => toast.add({ title: 'Réponse enregistrée', type: 'success' }),
    onError: () => toast.add({ title: "Impossible d'enregistrer votre réponse", type: 'error' }),
  });
}

/**
 * Upcoming doodle events, shared between the doodle and planning pages.
 * The key encodes the query parameters so it cannot collide with other
 * event lists (home page, calendar page...).
 */
export function upcomingDoodleEventsQuery(eventsApi: EventsApi) {
  const today = new Date();
  return queryOptions({
    queryKey: ['events', 'list', { dateGte: toIsoDate(today), isInDoodle: true, limit: EVENTS_FETCH_LIMIT }],
    queryFn: async () => await eventsApi.listEventsApiV1EventsGet({ limit: EVENTS_FETCH_LIMIT, dateGte: today, isInDoodle: true }),
  });
}

/**
 * All upcoming responses, shared between the doodle and planning pages.
 */
export function upcomingResponsesQuery(eventsApi: EventsApi) {
  const today = new Date();
  return queryOptions({
    queryKey: ['responses', 'list', { dateGte: toIsoDate(today) }],
    queryFn: async () => await eventsApi.listResponsesApiV1ResponsesGet({ dateGte: today }),
  });
}

/**
 * RSVP state-change log, most recent first. Restricted to holders of
 * view:response_history (staff/admin); used by the désinscriptions page.
 */
export function responseChangesQuery(eventsApi: EventsApi) {
  return queryOptions({
    queryKey: ['responses', 'changes'],
    queryFn: async () => await eventsApi.listResponseChangesApiV1ResponsesChangesGet(),
  });
}
