import { AuditKind, type AuditEvent } from 'bagad-client';

/** What the admin can narrow the journal to. */
export const SCOPES = [
  { value: 'all', label: 'Tout' },
  { value: 'mutations', label: 'Modifications' },
  { value: 'api', label: 'Appels API' },
  { value: 'pages', label: 'Pages vues' },
  { value: 'clicks', label: 'Clics' },
  { value: 'actions', label: 'Actions' },
] as const;
export type Scope = (typeof SCOPES)[number]['value'];

export function isScope(value: string): value is Scope {
  return SCOPES.some((s) => s.value === value);
}

/** Server-side query parameters a scope translates to. */
export function scopeParams(scope: Scope): { kind?: AuditKind; mutationsOnly?: boolean } {
  switch (scope) {
    case 'mutations':
      return { kind: AuditKind.ApiCall, mutationsOnly: true };
    case 'api':
      return { kind: AuditKind.ApiCall };
    case 'pages':
      return { kind: AuditKind.PageView };
    case 'clicks':
      return { kind: AuditKind.Click };
    case 'actions':
      return { kind: AuditKind.Action };
    default:
      return {};
  }
}

const HOURS_PER_DAY = 24;
const HOUR_MS = 3_600_000;
const DAY_MS = HOURS_PER_DAY * HOUR_MS;
const WEEK_DAYS = 7;
const MONTH_DAYS = 30;
const QUARTER_DAYS = 90;

export const PERIODS = [
  { value: '24h', label: '24 heures', ms: DAY_MS },
  { value: '7d', label: '7 jours', ms: WEEK_DAYS * DAY_MS },
  { value: '30d', label: '30 jours', ms: MONTH_DAYS * DAY_MS },
  { value: '90d', label: '90 jours', ms: QUARTER_DAYS * DAY_MS },
  { value: 'all', label: 'Tout', ms: null },
] as const;
export type Period = (typeof PERIODS)[number]['value'];

export function isPeriod(value: string): value is Period {
  return PERIODS.some((p) => p.value === value);
}

/** Lower bound for a period, or undefined for the whole journal. */
export function periodSince(period: Period, now: Date = new Date()): Date | undefined {
  const ms = PERIODS.find((p) => p.value === period)?.ms ?? null;
  return ms === null ? undefined : new Date(now.getTime() - ms);
}

export const KIND_LABELS: Record<AuditKind, string> = {
  [AuditKind.ApiCall]: 'API',
  [AuditKind.PageView]: 'Page',
  [AuditKind.Click]: 'Clic',
  [AuditKind.Action]: 'Action',
};

/**
 * The concrete location worth showing under the name, or null when it would
 * only repeat it: an API row's name is `METHOD pattern`, so its path is shown
 * when the pattern had parameters or the request had a query string; a page
 * view's path is shown when the route had parameters; a click or action
 * always names the page it happened on.
 */
export function shownPath(event: AuditEvent): string | null {
  const pattern = event.method ? event.name.slice(event.method.length + 1) : event.name;
  return event.path === pattern ? null : event.path;
}

/** The `outcome` an ACTION row reports, when present. */
export function outcomeOf(event: AuditEvent): string | null {
  const outcome: unknown = event.details?.outcome;
  return typeof outcome === 'string' ? outcome : null;
}

export type StatusTone = 'ok' | 'client-error' | 'server-error';

const CLIENT_ERROR_MIN = 400;
const SERVER_ERROR_MIN = 500;

export function statusTone(status: number): StatusTone {
  if (status >= SERVER_ERROR_MIN) return 'server-error';
  if (status >= CLIENT_ERROR_MIN) return 'client-error';
  return 'ok';
}
