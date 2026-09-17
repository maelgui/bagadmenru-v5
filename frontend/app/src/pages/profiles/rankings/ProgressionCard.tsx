import { useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { SeasonRanking } from 'bagad-client';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  buildProgression,
  MIN_SEASONS_FOR_TREND,
  seasonDelta,
  type MetricDef,
} from '../rankings.helpers';

function TrendBadge({ delta }: { delta: { improved: boolean } }) {
  const Icon = delta.improved ? TrendingUp : TrendingDown;
  return (
    <Badge variant={delta.improved ? 'default' : 'secondary'} className="gap-1">
      <Icon className="size-3.5" aria-hidden="true" />
      {delta.improved ? 'En progrès' : 'En baisse'}
    </Badge>
  );
}

export function ProgressionCard({
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
