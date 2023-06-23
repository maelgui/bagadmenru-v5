import { QueryClient } from '@tanstack/react-query';
import {
  Configuration, EventsApi, FilesApi, UsersApi,
} from 'bagad-client';

export const queryClient = new QueryClient();

const conf = new Configuration({ basePath: import.meta.env.VITE_BBE2_API_URL });
export const eventsApi = new EventsApi(conf);
export const usersApi = new UsersApi(conf);
export const filesApi = new FilesApi(conf);
