import { Configuration, EventsApi, UsersApi } from 'bagad-client';
import { QueryClient } from 'react-query';

export const queryClient = new QueryClient();

const conf = new Configuration({ basePath: import.meta.env.VITE_BBE2_API_URL });
export const eventsApi = new EventsApi(conf);
export const usersApi = new UsersApi(conf);
