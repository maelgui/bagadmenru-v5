import { QueryCache, QueryClient, useQuery } from '@tanstack/react-query';
import {
  AuthenticationApi,
  Configuration, DefaultApi, EventsApi, FilesApi,
  type Profile,
  ProfilesApi,
  PushNotificationsApi,
  ResponseError,
  type SessionInfo,
  UtilsApi,
} from 'bagad-client';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/toast';
import env from '../env';

const MAX_QUERY_RETRIES = 2;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;

// Multi-account selector cookie (mirrors the backend ACTIVE_ACCOUNT_COOKIE).
// It is NOT httpOnly, so switching accounts is a single client-side cookie
// write; the backend only trusts it when the matching signed bmr_session_<id>
// cookie is also present, so it is not a credential on its own.
export const ACTIVE_ACCOUNT_COOKIE = 'active_account';
const ACTIVE_ACCOUNT_MAX_AGE = 7776000; // 90 days in seconds, matches the session cookie

/** Point the browser at ``accountId`` as the active session. */
export function writeActiveAccount(accountId: string): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ACTIVE_ACCOUNT_COOKIE}=${encodeURIComponent(accountId)}`
    + `; Path=/; Max-Age=${ACTIVE_ACCOUNT_MAX_AGE}; SameSite=Lax${secure}`;
}

// Routes scoped to a specific resource (by id / target) where staying put after
// an account switch could surface a resource the newly active account is not
// allowed to see. On a switch we fall back to home for these; everywhere else
// we keep the current page. Matches a /profile/:id member sheet or the
// edit/settings screens, but not the /profile trombinoscope list itself.
const RESOURCE_SCOPED_PREFIXES = ['/profile/edit', '/profile/settings'];
const PROFILE_DETAIL_RE = /^\/profile\/[^/]+$/;

/**
 * Where to land after switching accounts: keep the current page unless it is
 * scoped to a specific resource (or an /auth page — switching from the account
 * chooser or login must not just reload that page), in which case go home.
 */
export function destinationAfterSwitch(pathname: string): string {
  const redirectHome = pathname.startsWith('/auth')
    || RESOURCE_SCOPED_PREFIXES.some((p) => pathname.startsWith(p))
    || PROFILE_DETAIL_RE.test(pathname);
  return redirectHome ? '/' : pathname;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ResponseError && error.response.status === HTTP_FORBIDDEN) {
        toast.add({ title: "Vous n'avez pas les droits nécessaires pour accéder à cette ressource.", type: 'error' });
      } else if (error instanceof ResponseError && error.response.status === HTTP_UNAUTHORIZED) {
        toast.add({ title: 'Vous ne semblez pas authentifié.', type: 'error' });
      } else {
        toast.add({ title: `Something went wrong: ${error.message}`, type: 'error' });
      }
    },

  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ResponseError
          && (error.response.status === HTTP_UNAUTHORIZED || error.response.status === HTTP_FORBIDDEN)) {
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
  defaultApi: new DefaultApi(apiConf),
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
    // Navigating to login *adds* a session (multi-account) rather than
    // replacing the current one — the backend sets an additive cookie.
    void navigate('/auth/login');
  }, [navigate]);

  // Switch the active account: rewrite the selector cookie then clear the whole
  // react-query cache so no data from the previous account can be rendered
  // (cache isolation). Keep the user on the current page (a full reload
  // guarantees a clean refetch under the new active account), except on
  // resource-scoped routes where we fall back to home to avoid showing a
  // resource the new account may not be allowed to see.
  const switchAccount = useCallback((accountId: string) => {
    writeActiveAccount(accountId);
    queryClient.clear();
    const { pathname, search } = window.location;
    const dest = destinationAfterSwitch(pathname);
    window.location.href = dest === pathname ? `${pathname}${search}` : dest;
  }, []);

  // Log out of a single account (defaults to the active one). The backend
  // deletes only that session cookie and returns the remaining sessions; we
  // then either land on a remaining account or leave for the marketing site.
  // The cache is cleared so the signed-out account's data never lingers.
  const logout = useCallback(
    ({ accountId, redirectTo }: { accountId?: string; redirectTo?: string } = {}) => {
      // Was the *active* account the one being signed out? (No id means the
      // active account; an explicit id matches only if it is the active one.)
      const loggedOutActive = accountId === undefined || accountId === account?.id;
      void authApi
        .logoutApiV1AuthLogoutPost({ logoutRequest: { accountId: accountId ?? null } })
        .then((remaining) => {
          queryClient.clear();
          if (redirectTo) {
            window.location.href = redirectTo;
          } else if (remaining.length === 0) {
            // No account left: leave for the public marketing site.
            window.location.href = 'https://bagadmenru.bzh';
          } else if (loggedOutActive && remaining.length > 1) {
            // The active account is gone and several remain: let the user pick
            // who to continue as rather than landing on an arbitrary one.
            // (The backend promoted one as a fallback so we stay authenticated.)
            window.location.href = '/auth/choose';
          } else {
            // Exactly one account remains, or a non-active account was removed:
            // no choice to make. Follow the switch rule — keep the current page
            // unless it is resource-scoped.
            const { pathname, search } = window.location;
            const dest = destinationAfterSwitch(pathname);
            window.location.href = dest === pathname ? `${pathname}${search}` : dest;
          }
        });
    },
    [authApi, account?.id],
  );

  return {
    status, account, login, logout, switchAccount,
  };
}

/**
 * List every account currently signed in this browser (multi-account).
 * Keyed separately from the profile so switching invalidates cleanly.
 */
export function useSessions() {
  const { authApi } = useApiClient();

  return useQuery<SessionInfo[]>({
    queryKey: ['auth', 'sessions'],
    queryFn: async () => await authApi.listSessionsApiV1AuthSessionsGet(),
    retry: false,
  });
}
