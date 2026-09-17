import type { RankingInfo, SeasonRanking, UserRankingItem } from 'bagad-client';
import { parse } from 'tinyduration';

export const PODIUM_SIZE = 3;
export const MIN_SEASONS_FOR_TREND = 2;
const PERCENT = 100;

// Duration conversion factors (approximate, for charting/comparison only).
const DAYS_PER_YEAR = 365;
const DAYS_PER_MONTH = 30;
const DAYS_PER_WEEK = 7;
const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = 1440;

// ---------------------------------------------------------------------------
// Metrics
//
// Ordered by the behaviour we want to encourage. Reactivity comes first and is
// the default: answering quickly (yes or no) lets the bagad commit to event
// organisers. Response rate rewards answering *every* event. Attendance
// (positive answers) is last and deliberately framed as informational, since
// each member gets involved at their own level.
// ---------------------------------------------------------------------------
export type MetricId = 'reactivity' | 'responseRate' | 'attendance';

export interface MetricDef {
  id: MetricId;
  label: string;
  short: string;
  rankKey: keyof Pick<
    RankingInfo,
    'medianResponseTimeRank' | 'responseRateRank' | 'nPositiveResponsesRank'
  >;
  higherIsBetter: boolean;
  /** True when the metric only makes sense within a single season. */
  seasonalOnly: boolean;
  /** Comparable numeric value for a ranking item (null = no data). */
  value: (ranks: RankingInfo) => number | null;
  /** Human-readable rendering of a value. */
  format: (value: number | null) => string;
}

function durationToDays(duration: string | null): number | null {
  if (!duration) return null;
  const parsed = parse(duration);
  const days =
    (parsed.years ?? 0) * DAYS_PER_YEAR +
    (parsed.months ?? 0) * DAYS_PER_MONTH +
    (parsed.weeks ?? 0) * DAYS_PER_WEEK +
    (parsed.days ?? 0) +
    (parsed.hours ?? 0) / HOURS_PER_DAY +
    (parsed.minutes ?? 0) / MINUTES_PER_DAY;
  return Number(days.toFixed(1));
}

function formatDelay(days: number | null): string {
  if (days == null) return 'N/A';
  if (days < 1) return "moins d'un jour";
  const rounded = Math.round(days);
  return `${String(rounded)} jour${rounded > 1 ? 's' : ''}`;
}

function formatRate(rate: number | null): string {
  if (rate == null) return 'N/A';
  return `${String(Math.round(rate * PERCENT))} %`;
}

export const METRICS: MetricDef[] = [
  {
    id: 'reactivity',
    label: 'Réactivité',
    short: 'Réactivité',
    rankKey: 'medianResponseTimeRank',
    higherIsBetter: false, // a shorter delay is better
    seasonalOnly: false,
    value: (ranks) => durationToDays(ranks.medianResponseTime),
    format: formatDelay,
  },
  {
    id: 'responseRate',
    label: 'Taux de réponse',
    short: 'Assiduité',
    rankKey: 'responseRateRank',
    higherIsBetter: true,
    seasonalOnly: true,
    value: (ranks) => ranks.responseRate,
    format: formatRate,
  },
  {
    id: 'attendance',
    label: 'Participations',
    short: 'Présence',
    rankKey: 'nPositiveResponsesRank',
    higherIsBetter: true,
    seasonalOnly: false,
    value: (ranks) => ranks.nPositiveResponses,
    format: (value) => (value == null ? 'N/A' : `${String(value)} sorties`),
  },
];

export function isMetricId(value: unknown): value is MetricId {
  return METRICS.some((m) => m.id === value);
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function seasonLabel(season: number): string {
  return `${String(season)}-${String(season + 1)}`;
}

export function windowLabel(season: number | null): string {
  return season == null ? 'Toutes saisons' : seasonLabel(season);
}

export function sortByMetric(
  items: UserRankingItem[],
  metric: MetricDef,
): UserRankingItem[] {
  return [...items].sort((a, b) => {
    const rankA = a.ranks[metric.rankKey];
    const rankB = b.ranks[metric.rankKey];
    if (rankA == null) return 1;
    if (rankB == null) return -1;
    return rankA - rankB;
  });
}

// Year-over-year delta on the active metric between the two most recent
// seasons where a value exists. Null when not comparable.
export function seasonDelta(
  points: Array<{ value: number | null }>,
  metric: MetricDef,
): { improved: boolean } | null {
  const withValue = points.filter((p) => p.value != null);
  if (withValue.length < MIN_SEASONS_FOR_TREND) return null;
  const current = withValue[withValue.length - 1].value;
  const previous = withValue[withValue.length - MIN_SEASONS_FOR_TREND].value;
  if (current == null || previous == null || current === previous) return null;
  const improved = metric.higherIsBetter ? current > previous : current < previous;
  return { improved };
}

// Current user's per-season series for the active metric, across seasonal
// windows only (the all-time window is excluded).
export function buildProgression(
  windows: SeasonRanking[],
  userId: string,
  metric: MetricDef,
): Array<{ season: string; value: number | null }> {
  const seasonal: Array<{ season: number; items: UserRankingItem[] }> = [];
  for (const w of windows) {
    if (w.season != null) seasonal.push({ season: w.season, items: w.items });
  }
  return seasonal
    .sort((a, b) => a.season - b.season)
    .map((w) => {
      const mine = w.items.find((it) => it.user.id === userId);
      return {
        season: seasonLabel(w.season),
        value: mine ? metric.value(mine.ranks) : null,
      };
    });
}
