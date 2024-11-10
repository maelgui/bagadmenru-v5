import { QueryCache, QueryClient, useQuery } from '@tanstack/react-query';
import {
  Configuration, EventsApi, FilesApi,
  ProfilesApi,
  ResponseError,
  UtilsApi,
} from 'bagad-client';
import toast from 'react-hot-toast';
import { useAuth } from 'react-oidc-context';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ResponseError && error.response.status === 403) {
        toast.error("Vous n'avez pas les droits nécessaire pour accéder à cette ressources.");
      } else if (error instanceof ResponseError && error.response.status === 401) {
        toast.error('Vous ne semblez pas authentifié.');
      } else {
        toast.error(`Something went wrong: ${error.message}`);
      }
    },

  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ResponseError && error.response.status === 401) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

export function useApiClient() {
  const auth = useAuth();

  const conf = new Configuration({
    basePath: import.meta.env.VITE_BBE2_API_URL,
    headers: { Authorization: `Bearer ${auth.user?.access_token}` },
  });

  return {
    eventsApi: new EventsApi(conf),
    usersApi: new ProfilesApi(conf),
    filesApi: new FilesApi(conf),
    utilsApi: new UtilsApi(conf),
  };
}

export function useUserProfile() {
  const { usersApi } = useApiClient();
  const { data, error } = useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: () => usersApi.getMyProfileApiV1ProfilesMeGet(),
  });
  const auth = useAuth();
  if (error instanceof ResponseError && error.response.status === 401) {
    auth.removeUser();
  }
  return data;
}

export function usePermissions() {
  const { usersApi } = useApiClient();
  const { data: roles } = useQuery({
    queryKey: ['profiles', 'me', 'permissions'],
    queryFn: () => usersApi.getMyPermissionsApiV1ProfilesMePermissionsGet(),
  });
  const has = (permission: string) => roles?.includes(permission) ?? false;
  return { roles, has };
}
