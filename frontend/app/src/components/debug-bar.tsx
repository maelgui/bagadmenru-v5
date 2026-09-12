import { useQuery } from '@tanstack/react-query';
import { Bug, X } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import type { SessionInfo } from 'bagad-client';

import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ACTIVE_ACCOUNT_COOKIE, useApiClient } from '../config/client';
import env from '../env';

// The devtools are stripped from production bundles when imported from the
// package root, and beta *is* a production build - so use the /production
// entry point. Lazy so the chunk is only downloaded when the toggle is
// flipped, never on the beta critical path.
const ReactQueryDevtools = lazy(async () => {
  const mod = await import('@tanstack/react-query-devtools/production');
  return { default: mod.ReactQueryDevtools };
});

// 'beta' | 'production' is injected at runtime on deployed environments
// (window.env via app-config.js); local dev has no runtime config so fall
// back on the Vite mode. Unknown -> 'production' so the bar can never show
// up on an environment that did not explicitly opt in.
const environment: string = env.VITE_ENVIRONMENT ?? (import.meta.env.DEV ? 'development' : 'production');

// Session ids are long UUIDs; a short prefix is enough to tell them apart
// (the full id stays available in the title attribute).
const SESSION_ID_PREFIX_LENGTH = 8;

/** Read a (non-httpOnly) cookie value, or null when absent. */
function readCookie(name: string): string | null {
  const entry = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return entry !== undefined ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

function Row({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono" title={value} data-testid={testId}>{value}</dd>
    </div>
  );
}

function SessionsSection({ sessions }: { sessions: SessionInfo[] | undefined }) {
  const activeAccount = readCookie(ACTIVE_ACCOUNT_COOKIE);

  return (
    <div>
      <p className="mb-1 font-semibold">
        Sessions (
        {sessions?.length ?? 0}
        )
      </p>
      {sessions !== undefined && sessions.length > 0
        ? (
          <ul className="space-y-0.5" data-testid="debug-bar-sessions">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 rounded-full ${session.active ? 'bg-green-500' : 'bg-muted-foreground/40'}`}
                />
                <span className="truncate">
                  {session.firstName}
                  {' '}
                  {session.lastName}
                </span>
                {session.active && <Badge variant="secondary" className="h-4 shrink-0 px-1.5">active</Badge>}
                <span className="ml-auto shrink-0 font-mono text-muted-foreground" title={session.id}>
                  {session.id.slice(0, SESSION_ID_PREFIX_LENGTH)}
                </span>
              </li>
            ))}
          </ul>
        )
        : <p className="text-muted-foreground">Aucune session (invité)</p>}
      <dl className="mt-1">
        <Row label="active_account" value={activeAccount ?? '(absent)'} testId="debug-bar-active-account" />
      </dl>
    </div>
  );
}

/**
 * Current account's roles and permissions. Rendered only when an active
 * session exists: both endpoints require auth, and fetching them as a guest
 * would surface the app-wide 401 error toast.
 */
function PermissionsSection() {
  const { usersApi } = useApiClient();

  const { data: roles } = useQuery({
    queryKey: ['profiles', 'me', 'roles'],
    queryFn: async () => await usersApi.getMyRolesApiV1ProfilesMeRolesGet(),
    retry: false,
  });

  const { data: permissions } = useQuery({
    queryKey: ['profiles', 'me', 'permissions'],
    queryFn: async () => await usersApi.getMyPermissionsApiV1ProfilesMePermissionsGet(),
    retry: false,
  });

  return (
    <div>
      <p className="mb-1 font-semibold">
        Rôles (
        {roles?.length ?? 0}
        )
      </p>
      {roles !== undefined && roles.length > 0
        ? (
          <div className="flex flex-wrap gap-1" data-testid="debug-bar-roles">
            {roles.filter((role) => role !== null).map((role) => (
              <Badge key={role} variant="outline" className="font-mono">{role}</Badge>
            ))}
          </div>
        )
        : <p className="text-muted-foreground">Aucun rôle</p>}
      <p className="mt-2 mb-1 font-semibold">
        Permissions (
        {permissions?.length ?? 0}
        )
      </p>
      {permissions !== undefined && permissions.length > 0
        ? (
          <ul className="max-h-28 space-y-0.5 overflow-y-auto font-mono" data-testid="debug-bar-permissions">
            {permissions.map((permission) => <li key={permission}>{permission}</li>)}
          </ul>
        )
        : <p className="text-muted-foreground">Aucune permission</p>}
    </div>
  );
}

/**
 * Expanded debug panel. Mounted only when the bar is open, so none of its
 * queries run while the bar sits collapsed.
 */
function DebugPanel({ onClose }: { onClose: () => void }) {
  const { authApi, defaultApi } = useApiClient();
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);

  // Same cache entry as <VersionInfo /> in the footer.
  const { data: versionData } = useQuery({
    queryKey: ['version'],
    queryFn: async () => await defaultApi.versionApiV1VersionGet(),
    staleTime: Infinity,
    retry: false,
  });

  // Public endpoint: it only reflects the session cookies the browser already
  // holds and returns [] for a guest - no 401, no global error toast.
  const { data: sessions } = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: async () => await authApi.listSessionsApiV1AuthSessionsGet(),
    retry: false,
  });

  const hasActiveSession = sessions?.some((session) => session.active) ?? false;

  return (
    <section
      aria-label="Barre de débogage"
      data-testid="debug-bar-panel"
      className="w-80 space-y-3 rounded-2xl border border-amber-500/50 bg-card p-3 text-xs text-foreground shadow-xl"
    >
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-semibold">
          <Bug className="size-3.5" aria-hidden="true" />
          Debug
          <Badge data-testid="debug-bar-env" className="bg-amber-500 text-amber-950">{environment}</Badge>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la barre de débogage"
          data-testid="debug-bar-close"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      <dl className="space-y-1">
        <Row label="Frontend" value={String(import.meta.env.VITE_APP_VERSION ?? 'dev')} />
        <Row label="Backend" value={versionData ? versionData.version : '…'} testId="debug-bar-backend-version" />
        <Row label="API" value={env.VITE_BBE2_API_URL} testId="debug-bar-api-url" />
      </dl>

      <SessionsSection sessions={sessions} />

      {hasActiveSession && <PermissionsSection />}

      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">React Query devtools</span>
        <Switch
          size="sm"
          checked={devtoolsOpen}
          onCheckedChange={(checked) => { setDevtoolsOpen(checked); }}
          aria-label="React Query devtools"
          data-testid="debug-bar-devtools-toggle"
        />
      </div>
      {devtoolsOpen && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen buttonPosition="bottom-right" />
        </Suspense>
      )}
    </section>
  );
}

/**
 * Floating debug bar for non-production environments (beta, local dev).
 *
 * Collapsed by default to a small amber pill naming the environment - the
 * "am I on beta?" signal. Expanded, it shows frontend/backend versions, the
 * resolved API base URL, the multi-account sessions in this browser (with the
 * active_account selector cookie), the current account's permissions, and a
 * toggle for the React Query devtools. Session *tokens* are httpOnly cookies
 * and are deliberately never displayed - only account ids and states.
 *
 * Never rendered on production: gated on the runtime-injected
 * VITE_ENVIRONMENT, defaulting to hidden when it is absent.
 */
export default function DebugBar() {
  const [open, setOpen] = useState(false);

  if (environment === 'production') return null;

  return (
    <div className="fixed bottom-3 left-3 z-50 print:hidden">
      {open
        ? <DebugPanel onClose={() => { setOpen(false); }} />
        : (
          <button
            type="button"
            onClick={() => { setOpen(true); }}
            aria-label={`Ouvrir la barre de débogage (environnement ${environment})`}
            data-testid="debug-bar-toggle"
            className="flex items-center gap-1.5 rounded-full border border-amber-500/60 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-lg hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
          >
            <Bug className="size-3.5" aria-hidden="true" />
            {environment}
          </button>
        )}
    </div>
  );
}
