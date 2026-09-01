import { Medal, Trophy, type LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Profile, RankingInfo, UserRankingItem } from 'bagad-client';
import { Link } from 'react-router-dom';
import { parse } from 'tinyduration';
import defaultAvatar from '../../assets/default.svg';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';

const TOP_RANKINGS_COUNT = 3;

const rankConfigs: Array<{
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  positionClass: string;
}> = [
  {
    icon: Trophy,
    iconClassName: 'text-primary',
    title: '1er',
    positionClass: 'order-2 mt-0 md:mt-0',
  },
  {
    icon: Medal,
    iconClassName: 'text-muted-foreground',
    title: '2ème',
    positionClass: 'order-1 mt-0 md:mt-8',
  },
  {
    icon: Medal,
    iconClassName: 'text-accent-foreground',
    title: '3ème',
    positionClass: 'order-3 mt-0 md:mt-16',
  },
];

// Type-safe key categories for RankingInfo
type RankingRankKey = {
  [K in keyof RankingInfo]: K extends `${string}Rank` ? K : never;
}[keyof RankingInfo];
type RankingValueKey = Exclude<keyof RankingInfo, RankingRankKey>;

// Component for displaying a podium position
function PodiumPosition({
  rank,
  user,
  title,
  formattedValue,
}: {
  rank: number;
  user: Profile;
  title: string;
  formattedValue: string;
}) {
  const { icon: Icon, iconClassName } = rankConfigs[rank - 1];

  return (
    <Link to={`/profile/${user.id}`} className="flex w-full flex-col items-center surface rounded-4xl p-4 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      <div className="mb-2">
        <Icon className={`size-6 ${iconClassName}`} aria-hidden="true" />
      </div>
      <div className={`mb-3 size-24 overflow-hidden rounded-full border-4 border-current ${iconClassName}`}>
        <img
          src={user.pictureUrl ?? defaultAvatar}
          alt={`${user.firstName} ${user.lastName[0]}`}
          className="size-full object-cover"
        />
      </div>
      <h3 className="text-lg font-bold">
        {user.firstName}
      </h3>
      <div className="mt-1 text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 font-semibold">{formattedValue}</div>
    </Link>
  );
}

// Display order mapping: index 0 (1st) → middle, index 1 (2nd) → left, index 2 (3rd) → right
const DISPLAY_ORDER = [1, 0, 1 + 1] as const;

// Component for displaying a podium with top 3 users
function Podium<V extends RankingValueKey>({
  title,
  rankings,
  rankingKey,
  valueKey,
  valueFormatter = (val) => String(val),
}: {
  title: string;
  rankings: UserRankingItem[];
  rankingKey: RankingRankKey;
  valueKey: V;
  valueFormatter?: (value: RankingInfo[V]) => string;
}) {
  // Sort users by the specified ranking key
  const sortedRankings = [...rankings].sort((a, b) => {
    const rankA = a.ranks[rankingKey];
    const rankB = b.ranks[rankingKey];

    if (rankA === null) return 1;
    if (rankB === null) return -1;

    return rankA - rankB;
  }).slice(0, TOP_RANKINGS_COUNT);

  // Arrange podium positions with 2nd, 1st, 3rd order for display
  const podiumOrder = sortedRankings.map((user, index) => ({
    user,
    rank: index + 1,
    displayOrder: DISPLAY_ORDER[index] ?? index,
  })).sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="mb-12">
      <h2 className="mb-6 text-center text-xl font-bold">{title}</h2>
      <div className="flex flex-col items-start justify-center gap-4 md:flex-row">
        {podiumOrder.map((item) => {
          const { positionClass, title: rankTitle } = rankConfigs[item.rank - 1];

          return (
            <div
              key={item.user.user.id}
              className={`flex w-48 justify-center ${positionClass}`}
            >
              <PodiumPosition
                rank={item.rank}
                user={item.user.user}
                title={rankTitle}
                formattedValue={valueFormatter(item.user.ranks[valueKey])}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Format time duration (for response time)
function formatDuration(duration: string): string {
  if (!duration) return 'N/A';

  const parsedDuration = parse(duration);
  if (parsedDuration.years) {
    return `${String(parsedDuration.years)} années`;
  }
  if (parsedDuration.weeks) {
    return `${String(parsedDuration.weeks)} semaines`;
  }
  if (parsedDuration.days) {
    return `${String(parsedDuration.days)} jours`;
  }
  if (parsedDuration.hours) {
    return `${String(parsedDuration.hours)} heures`;
  }
  if (parsedDuration.minutes) {
    return `${String(parsedDuration.minutes)} minutes`;
  }
  if (parsedDuration.seconds) {
    return `${String(parsedDuration.seconds)} secondes`;
  }

  return 'N/A';
}

export default function RankingsPage() {
  const { usersApi } = useApiClient();

  // Fetch rankings data
  const { data, isLoading, error } = useQuery({
    queryKey: ['rankings'],
    queryFn: async () => await usersApi.getUserRankingsApiV1StatsRankingsGet(),
  });

  return (
    <>
      <Header
        title="Classements"
        subtitle="Les meilleurs participants"
        breadcrumb={[
          { title: 'Classements' },
        ]}
      />

      <Container>
        {isLoading && (
          <div className="py-8 text-center">Chargement des classements...</div>
        )}

        {error && (
          <div className="py-8 text-center text-destructive">
            Une erreur est survenue lors du chargement des classements.
          </div>
        )}

        {data?.rankings && data.rankings.length > 0 && (
          <>
            {/* Podium for most positive responses */}
            <Podium
              title="Podium des réponses positives"
              rankings={data.rankings}
              rankingKey="nPositiveResponsesRank"
              valueKey="nPositiveResponses"
              valueFormatter={(value) => `${String(value)} réponses`}
            />

            {/* Podium for most responses */}
            <Podium
              title="Podium des réponses totales"
              rankings={data.rankings}
              rankingKey="nResponsesRank"
              valueKey="nResponses"
              valueFormatter={(value) => `${String(value)} réponses`}
            />

            {/* Podium for fastest response time */}
            <Podium
              title="Podium des temps de réponse les plus rapides"
              rankings={data.rankings}
              rankingKey="avgResponseTimeRank"
              valueKey="avgResponseTime"
              valueFormatter={(value) => value != null ? formatDuration(value) : 'N/A'}
            />
          </>
        )}

        {data?.rankings.length === 0 && (
          <div className="py-8 text-center">
            Aucun classement disponible pour le moment.
          </div>
        )}
      </Container>
    </>
  );
}
