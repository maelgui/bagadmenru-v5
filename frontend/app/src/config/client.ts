import { QueryCache, QueryClient } from '@tanstack/react-query';
import {
  Configuration, EventsApi, FilesApi, ResponseError, UsersApi,
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
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

const conf = new Configuration({ basePath: import.meta.env.VITE_BBE2_API_URL });
export const eventsApi = new EventsApi(conf);
export const usersApi = new UsersApi(conf);
export const filesApi = new FilesApi(conf);
