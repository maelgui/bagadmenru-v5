import { useOidcFetch } from '@axa-fr/react-oidc';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import {
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
  const { fetch } = useOidcFetch();
  const conf = new Configuration({ basePath: import.meta.env.VITE_BBE2_API_URL, fetchApi: fetch });

  return {
    eventsApi: new EventsApi(conf),
    usersApi: new ProfilesApi(conf),
    filesApi: new FilesApi(conf),
  };
}
