import { useState } from 'react';
import { Info, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { SeasonRanking } from 'bagad-client';

import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, useUserProfile } from '../../config/client';
import {
  isMetricId,
  METRICS,
  PODIUM_SIZE,
  sortByMetric,
  windowLabel,
  type MetricId,
} from './rankings.helpers';
import { Podium } from './rankings/Podium';
import { ProgressionCard } from './rankings/ProgressionCard';
import { RankingsTable } from './rankings/RankingsTable';

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
