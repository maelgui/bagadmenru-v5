import { LoadedPolicy, loadPolicy } from '@open-policy-agent/opa-wasm';
import { QueryCache, QueryClient, useQuery } from '@tanstack/react-query';
import {
  AuthenticationApi,
  Configuration, EventsApi, FilesApi,
  ProfilesApi,
  ResponseError,
  UtilsApi,
} from 'bagad-client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import policyBundleUrl from '../assets/policy.wasm?url';
import env from '../env';
import { AuthStatus, useProfileStore } from '../utils/authStore';

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
  const conf = new Configuration({
    basePath: env.VITE_BBE2_API_URL,
    credentials: 'include',
    // headers: { Authorization: `Bearer ${auth.user?.access_token}` },
  });

  return {
    eventsApi: new EventsApi(conf),
    usersApi: new ProfilesApi(conf),
    filesApi: new FilesApi(conf),
    utilsApi: new UtilsApi(conf),
    authApi: new AuthenticationApi(conf),
  };
}

export function useUserProfile() {
  const { usersApi } = useApiClient();

  const { data } = useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: () => usersApi.getMyProfileApiV1ProfilesMeGet(),
  });
  // const auth = useAuth();
  // if (error instanceof ResponseError && error.response.status === 401) {
  //   auth.removeUser();
  // }
  return data;
}

export function usePermissions() {
  const { usersApi } = useApiClient();
  const { data: roles } = useQuery({
    queryKey: ['profiles', 'me', 'permissions'],
    queryFn: () => usersApi.getMyRolesApiV1ProfilesMeRolesGet(),
  });

  const [policy, setPolicy] = useState<LoadedPolicy | undefined>(undefined);

  useEffect(() => {
    loadPolicy(fetch(policyBundleUrl)).then((p) => setPolicy(p));
  }, []);

  const can = useCallback((action: string, resource: string) => {
    if (policy === undefined) {
      return false;
    }
    let allow = false;
    try {
      const res = policy.evaluate({ action, resource, user: { roles } });
      allow = res[0].result.allow;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Unable to evaluate policy');
    }
    return allow;
  }, [policy, roles]);

  return { roles, can };
}

export function useAuth() {
  const { account, setAccount } = useProfileStore();
  const { usersApi, authApi } = useApiClient();
  const navigate = useNavigate();

  let status;
  switch (account) {
    case null:
      status = AuthStatus.Guest;
      break;
    case undefined:
      status = AuthStatus.Unknown;
      break;
    default:
      status = AuthStatus.Authenticated;
      break;
  }

  useEffect(() => {
    usersApi.getMyProfileApiV1ProfilesMeGet().then((user) => {
      setAccount(user);
    }).catch(() => {
      setAccount(null);
    });
  }, []);

  const login = useCallback(() => {
    navigate('/auth/login');
  }, []);

  const logout = useCallback(({ redirectTo = 'https://bagadmenru.bzh' }: { redirectTo: string }) => {
    authApi.logoutApiV1AuthLogoutPost().then(() => {
      setAccount(null);
      window.location.href = redirectTo;
    });
  }, []);

  return {
    status, account, login, logout,
  };
}
