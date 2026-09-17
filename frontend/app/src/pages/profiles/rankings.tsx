import { useMemo, useState } from 'react';
import { Info, Medal, TrendingDown, TrendingUp, Trophy, Zap, type LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { SeasonRanking, UserRankingItem } from 'bagad-client';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, useUserProfile } from '../../config/client';
import {
  buildProgression,
  initials,
  isMetricId,
  METRICS,
  MIN_SEASONS_FOR_TREND,
  PODIUM_SIZE,
  seasonDelta,
  sortByMetric,
  windowLabel,
  type MetricDef,
  type MetricId,
} from './rankings.helpers';

const PODIUM_CONFIG: Array<{ icon: LucideIcon; iconClass: string; ring: string }> = [
  { icon: Trophy, iconClass: 'text-amber-500', ring: 'ring-amber-400' },
  { icon: Medal, iconClass: 'text-slate-400', ring: 'ring-slate-300' },
  { icon: Medal, iconClass: 'text-orange-700', ring: 'ring-orange-600' },
];

// Podium display order: 2nd, 1st, 3rd, with 1st raised in the middle.
const PODIUM_LAYOUT = [
  { order: 'order-2', height: 'h-16 md:h-20', avatar: 'size-24' }, // 1st
  { order: 'order-1', height: 'h-12 md:h-14', avatar: 'size-20' }, // 2nd
  { order: 'order-3', height: 'h-10', avatar: 'size-20' }, // 3rd
];

function PodiumCard({
  item,
  position,
  metric,
}: {
  item: UserRankingItem;
  position: number;
  metric: MetricDef;
}) {
  const { icon: Icon, iconClass, ring } = PODIUM_CONFIG[position];
  const layout = PODIUM_LAYOUT[position];
  const { user } = item;

  return (
    <div className={`flex w-full flex-col items-center ${layout.order}`}>
      <Link
        to={`/profile/${user.id}`}
        className="flex flex-col items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Icon className={`mb-2 size-7 ${iconClass}`} aria-hidden="true" />
        <Avatar className={`${layout.avatar} ring-4 ${ring} ring-offset-2 ring-offset-background`}>
          <AvatarImage src={user.pictureUrl ?? undefined} alt={`${user.firstName} ${user.lastName}`} />
          <AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback>
        </Avatar>
        <span className="mt-3 font-bold">{user.firstName}</span>
        <span className="text-sm font-semibold text-muted-foreground">
          {metric.format(metric.value(item.ranks))}
        </span>
      </Link>
      <div
        className={`mt-3 flex w-full items-start justify-center rounded-t-xl bg-muted pt-2 text-2xl font-black text-muted-foreground ${layout.height}`}
      >
        {position + 1}
      </div>
    </div>
  );
}

function Podium({ top, metric }: { top: UserRankingItem[]; metric: MetricDef }) {
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 items-end gap-4 md:grid-cols-3">
      {top.map((item, index) => (
        <PodiumCard key={item.user.id} item={item} position={index} metric={metric} />
      ))}
    </div>
  );
}

// Year-over-year delta for the current user, on the active metric, between the
function TrendBadge({ delta }: { delta: { improved: boolean } }) {
  const Icon = delta.improved ? TrendingUp : TrendingDown;
  return (
    <Badge variant={delta.improved ? 'default' : 'secondary'} className="gap-1">
      <Icon className="size-3.5" aria-hidden="true" />
      {delta.improved ? 'En progrès' : 'En baisse'}
    </Badge>
  );
}

function ProgressionCard({
  windows,
  userId,
  metric,
}: {
  windows: SeasonRanking[];
  userId: string;
  metric: MetricDef;
}) {
  const chartData = useMemo(
    () => buildProgression(windows, userId, metric),
    [windows, userId, metric],
  );
  const points = chartData.filter((d) => d.value != null);
  const delta = seasonDelta(chartData, metric);

  const chartConfig = {
    value: { label: metric.label, color: 'var(--color-primary)' },
  } satisfies ChartConfig;

  return (
    <Card className="mb-10">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Ma progression</CardTitle>
            <CardDescription>{metric.label}, saison par saison</CardDescription>
          </div>
          {delta ? <TrendBadge delta={delta} /> : null}
        </div>
      </CardHeader>
      <CardContent>
        {points.length < MIN_SEASONS_FOR_TREND ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Pas encore assez d’historique pour afficher une progression.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <LineChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="season" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={36} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function RankingsTable({
  rows,
  metric,
  currentUserId,
}: {
  rows: UserRankingItem[];
  metric: MetricDef;
  currentUserId?: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Membre</TableHead>
          <TableHead className="text-right">{metric.label}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((item, index) => {
          const isMe = currentUserId === item.user.id;
          return (
            <TableRow key={item.user.id} data-state={isMe ? 'selected' : undefined}>
              <TableCell className="font-semibold text-muted-foreground">
                {index + PODIUM_SIZE + 1}
              </TableCell>
              <TableCell>
                <Link
                  to={`/profile/${item.user.id}`}
                  className="flex items-center gap-3 hover:underline"
                >
                  <Avatar size="sm">
                    <AvatarImage
                      src={item.user.pictureUrl ?? undefined}
                      alt={`${item.user.firstName} ${item.user.lastName}`}
                    />
                    <AvatarFallback>
                      {initials(item.user.firstName, item.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    {item.user.firstName} {item.user.lastName}
                  </span>
                  {isMe && (
                    <Badge variant="outline" className="ml-1">
                      Vous
                    </Badge>
                  )}
                </Link>
              </TableCell>
              <TableCell className="text-right font-medium">
                {metric.format(metric.value(item.ranks))}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function RankingsContent({
  windows,
  currentUserId,
}: {
  windows: SeasonRanking[];
  currentUserId?: string;
}) {
  // Newest window first; the all-time window (season === null) sorts last.
  const [seasonKey, setSeasonKey] = useState<string>(() => String(windows[0]?.season ?? 'all'));
  const [metricId, setMetricId] = useState<MetricId>('reactivity');

  const activeWindow =
    windows.find((w) => String(w.season ?? 'all') === seasonKey) ?? windows[0];
  const isAllTime = activeWindow.season == null;

  // Response rate is meaningless across seasons, so hide it in the all-time
  // window and fall back to reactivity if it was selected.
  const availableMetrics = METRICS.filter((m) => !(isAllTime && m.seasonalOnly));
  const metric =
    availableMetrics.find((m) => m.id === metricId) ?? availableMetrics[0];

  // The member list is small (a bagad's active members), so sorting on each
  // render is cheap and avoids fighting the React Compiler over memoization.
  const sorted = sortByMetric(activeWindow.items, metric);
  const top = sorted.slice(0, PODIUM_SIZE);
  const rest = sorted.slice(PODIUM_SIZE);

  return (
    <div className="space-y-8">
      <Alert className="mx-auto max-w-2xl">
        <Info />
        <AlertTitle>Répondre vite, c’est l’essentiel</AlertTitle>
        <AlertDescription>
          Répondre vite aux événements, oui ou non, permet au bagad de s’engager
          sereinement auprès des organisateurs. C’est ce que ce classement met
          en avant en priorité. Chacun participe ensuite aux sorties selon ses
          disponibilités.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col items-center gap-3">
        <ToggleGroup
          value={[seasonKey]}
          onValueChange={(value) => {
            const next = value[value.length - 1];
            if (next) setSeasonKey(next);
          }}
          aria-label="Choisir la saison"
        >
          {windows.map((w) => (
            <ToggleGroupItem key={String(w.season ?? 'all')} value={String(w.season ?? 'all')}>
              {windowLabel(w.season)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <ToggleGroup
          value={[metric.id]}
          onValueChange={(value) => {
            const next = value[value.length - 1];
            if (isMetricId(next)) setMetricId(next);
          }}
          aria-label="Choisir la métrique du classement"
        >
          {availableMetrics.map((m) => (
            <ToggleGroupItem key={m.id} value={m.id}>
              {m.short}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <Podium top={top} metric={metric} />

      {currentUserId && (
        <ProgressionCard windows={windows} userId={currentUserId} metric={metric} />
      )}

      <RankingsTable rows={rest} metric={metric} currentUserId={currentUserId} />
    </div>
  );
}

function RankingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="mx-auto h-9 w-72" />
      <div className="mx-auto grid max-w-2xl grid-cols-3 items-end gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-52" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function RankingsPage() {
  const { usersApi } = useApiClient();
  const currentUser = useUserProfile();

  const { data, isLoading, error } = useQuery({
    queryKey: ['rankings'],
    queryFn: async () => await usersApi.getUserRankingsApiV1StatsRankingsGet(),
  });

  const hasData = data != null && data.seasons.length > 0;

  return (
    <>
      <Header
        title="Classements"
        subtitle="Réactivité et engagement des membres"
        breadcrumb={[{ title: 'Classements' }]}
      />

      <Container>
        {isLoading && <RankingsSkeleton />}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              Le chargement des classements a échoué. Réessaie plus tard.
            </AlertDescription>
          </Alert>
        )}

        {data != null && !hasData && (
          <Empty>
            <EmptyMedia variant="icon">
              <Zap />
            </EmptyMedia>
            <EmptyTitle>Aucun classement pour le moment</EmptyTitle>
            <EmptyDescription>
              Les classements apparaîtront dès que les membres auront répondu à des événements.
            </EmptyDescription>
          </Empty>
        )}

        {hasData && (
          <RankingsContent windows={data.seasons} currentUserId={currentUser?.id} />
        )}
      </Container>
    </>
  );
}
