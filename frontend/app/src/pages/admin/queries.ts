import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../config/client';

export function useAdminOverview() {
  const { adminApi } = useApiClient();
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => await adminApi.getOverviewApiV1AdminOverviewGet(),
  });
}

export function useAdminMembers() {
  const { adminApi } = useApiClient();
  return useQuery({
    queryKey: ['admin', 'members'],
    queryFn: async () => await adminApi.listMembersApiV1AdminMembersGet(),
  });
}

export function useAdminRoles() {
  const { adminApi } = useApiClient();
  return useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => await adminApi.listRoleDetailsApiV1AdminRolesGet(),
  });
}

export function useAdminApiKeys() {
  const { adminApi } = useApiClient();
  return useQuery({
    queryKey: ['admin', 'api-keys'],
    queryFn: async () => await adminApi.listApiKeysApiV1AdminApiKeysGet(),
  });
}

export function useSystemStatus() {
  const { adminApi } = useApiClient();
  return useQuery({
    queryKey: ['admin', 'system'],
    queryFn: async () => await adminApi.getSystemStatusApiV1AdminSystemGet(),
  });
}

export function useGroups() {
  const { usersApi } = useApiClient();
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => await usersApi.listGroupsApiV1GroupsGet(),
  });
}

export function useUnlinkedMemberships() {
  const { helloAssoApi } = useApiClient();
  return useQuery({
    queryKey: ['helloasso', 'unlinked'],
    queryFn: async () => await helloAssoApi.listUnlinkedMembershipsApiV1HelloassoOrdersUnlinkedGet(),
  });
}

/** Season label as the backend computes it: September starts a new season. */
const SEASON_START_MONTH = 9;

export function currentSeasonLabel(now: Date = new Date()): string {
  const start = now.getMonth() + 1 >= SEASON_START_MONTH ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}
