import { queryOptions } from '@tanstack/react-query';
import type { ProfilesApi } from 'bagad-client';

/**
 * Every active member. Shared by the member list, the doodle/planning/event
 * pages and the membership reconciliation; mutations invalidate ['profiles'].
 */
export function profilesQuery(usersApi: ProfilesApi) {
  return queryOptions({
    queryKey: ['profiles'],
    queryFn: async () => await usersApi.listProfilesApiV1ProfilesGet(),
  });
}
