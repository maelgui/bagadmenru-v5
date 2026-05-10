import { QueryCache, QueryClient, useQuery } from '@tanstack/react-query';
import {
  AuthenticationApi,
  Configuration, EventsApi, FilesApi,
  type Profile,
  ProfilesApi,
  PushNotificationsApi,
  ResponseError,
  UtilsApi,
} from 'bagad-client';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import env from '../env';

const MAX_QUERY_RETRIES = 2;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ResponseError && error.response.status === HTTP_FORBIDDEN) {
        toast.error("Vous n'avez pas les droits nécessaire pour accéder à cette ressources.");
      } else if (error instanceof ResponseError && error.response.status === HTTP_UNAUTHORIZED) {
        toast.error('Vous ne semblez pas authentifié.');
      } else {
        toast.error(`Something went wrong: ${error.message}`);
      }
    },

  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ResponseError && error.response.status === HTTP_UNAUTHORIZED) {
          return false;
        }
        return failureCount < MAX_QUERY_RETRIES;
      },
    },
  },
});

const apiConf = new Configuration({
  basePath: env.VITE_BBE2_API_URL,
  credentials: 'include',
});

const apiClient = {
  eventsApi: new EventsApi(apiConf),
  usersApi: new ProfilesApi(apiConf),
  filesApi: new FilesApi(apiConf),
  utilsApi: new UtilsApi(apiConf),
  authApi: new AuthenticationApi(apiConf),
  pushApi: new PushNotificationsApi(apiConf),
};

export function useApiClient() {
  return apiClient;
}

export enum AuthStatus {
  Guest = 'GUEST',
  Authenticated = 'AUTHENTICATED',
  Unknown = 'UNKNOWN',
}

export function useUserProfile() {
  const { usersApi } = useApiClient();

  const { data } = useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: async () => await usersApi.getMyProfileApiV1ProfilesMeGet(),
  });
  return data;
}

export function usePermissions() {
  const { usersApi } = useApiClient();

  const { data: permissions } = useQuery({
    queryKey: ['profiles', 'me', 'permissions'],
    queryFn: async () => await usersApi.getMyPermissionsApiV1ProfilesMePermissionsGet(),
  });

  const can = useCallback((action: string, resource: string) => {
    if (!permissions) return false;
    return permissions.includes(`${action}:${resource}`);
  }, [permissions]);

  return { permissions, can };
}

export function useAuth() {
  const { usersApi, authApi } = useApiClient();
  const navigate = useNavigate();

  const { data: account, isPending, isError } = useQuery<Profile>({
    queryKey: ['profiles', 'me'],
    queryFn: async () => await usersApi.getMyProfileApiV1ProfilesMeGet(),
    retry: false,
  });

  const status = (() => {
    if (isPending) return AuthStatus.Unknown;
    if (isError) return AuthStatus.Guest;
    return AuthStatus.Authenticated;
  })();

  const login = useCallback(() => {
    void navigate('/auth/login');
  }, [navigate]);

  const logout = useCallback(({ redirectTo = 'https://bagadmenru.bzh' }: { redirectTo: string }) => {
    void authApi.logoutApiV1AuthLogoutPost().then(() => {
      queryClient.setQueryData(['profiles', 'me'], null);
      queryClient.removeQueries({ queryKey: ['profiles', 'me'] });
      window.location.href = redirectTo;
    });
  }, [authApi]);

  return {
    status, account, login, logout,
  };
}
