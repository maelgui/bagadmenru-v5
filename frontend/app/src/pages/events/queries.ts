import { queryOptions } from '@tanstack/react-query';
import type { EventsApi } from 'bagad-client';
import { toIsoDate } from '../../utils/date';

const EVENTS_FETCH_LIMIT = 100;

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
