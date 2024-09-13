import { QueryCache, QueryClient, useQuery } from '@tanstack/react-query';
import {
  AuthApi,
  Configuration, EventsApi, FilesApi,
  ProfilesApi,
  ResponseError,
} from 'bagad-client';
import toast from 'react-hot-toast';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ResponseError && error.response.status === 403) {
        toast.error("Vous n'avez pas les droits nécessaire pour accéder à cette ressources.");
      } else if (error instanceof ResponseError && error.response.status === 401) {
        toast.error("Vous n'avez pas les droits nécessaire pour accéder à cette ressources.");
      } else {
        toast.error(`Something went wrong: ${error.message}`);
      }
    },

  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ResponseError && error.response.status === 403) {
          return failureCount < 1;
        }
        return failureCount < 2;
      },
    },
  },
});

export function useApiClient() {
  const conf = new Configuration({ basePath: import.meta.env.VITE_BBE2_API_URL });

  return {
    auth: new AuthApi(conf),
    eventsApi: new EventsApi(conf),
    usersApi: new ProfilesApi(conf),
    filesApi: new FilesApi(conf),
  };
}

export function useUserProfile() {
  const { usersApi } = useApiClient();
  const { data } = useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: () => usersApi.getMyProfileApiV1ProfilesMeGet(),
  });
  return data;
}
