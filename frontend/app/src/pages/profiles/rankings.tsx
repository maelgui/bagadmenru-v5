import { faMedal, faTrophy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { parse } from 'tinyduration';
import { UserRankingItem, RankingInfo, Profile } from 'bagad-client';
import defaultAvatar from '../../assets/default.svg';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';

// Define medal colors
const medalColors = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

// Component for displaying a podium position
function PodiumPosition({
  rank,
  user,
  title,
  value,
  valueFormatter = (val: any) => String(val),
}: {
  rank: number;
  user: Profile;
  title: string;
  value: any;
  valueFormatter?: (value: any) => string;
}) {
  // Determine medal color based on rank
  let medalColor = '';
  let medalIcon = null;

  if (rank === 1) {
    medalColor = medalColors.gold;
    medalIcon = <FontAwesomeIcon icon={faTrophy} className="text-2xl" style={{ color: medalColors.gold }} />;
  } else if (rank === 2) {
    medalColor = medalColors.silver;
    medalIcon = <FontAwesomeIcon icon={faMedal} className="text-2xl" style={{ color: medalColors.silver }} />;
  } else if (rank === 3) {
    medalColor = medalColors.bronze;
    medalIcon = <FontAwesomeIcon icon={faMedal} className="text-2xl" style={{ color: medalColors.bronze }} />;
  }

  // Format the value if a formatter is provided
  const formattedValue = valueFormatter ? valueFormatter(value) : value;

  return (
    <Link to={`/profile/${user.id}`} className="flex flex-col w-full items-center p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow bg-white">
      <div className="mb-2">
        {medalIcon}
      </div>
      <div className="w-24 h-24 rounded-full overflow-hidden mb-3 border-4" style={{ borderColor: medalColor }}>
        <img
          src={user.pictureUrl ?? defaultAvatar}
          alt={`${user.firstName} ${user.lastName}`}
          className="w-full h-full object-cover"
        />
      </div>
      <h3 className="font-bold text-lg">
        {user.firstName}
        {' '}
        {user.lastName}
      </h3>
      <div className="text-sm text-gray-600 mt-1">{title}</div>
      <div className="font-semibold mt-1">{formattedValue}</div>
    </Link>
  );
}

// Component for displaying a podium with top 3 users
function Podium({
  title,
  rankings,
  rankingKey,
  valueKey,
  valueFormatter = (val: any) => String(val),
}: {
  title: string;
  rankings: UserRankingItem[];
  rankingKey: string;
  valueKey: string;
  valueFormatter?: (value: any) => string;
}) {
  // Sort users by the specified ranking key
  const sortedRankings = [...rankings].sort((a, b) => {
    // Convert snake_case keys to camelCase for TypeScript
    const camelKey = rankingKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const rankA = a.ranks[camelKey as keyof RankingInfo];
    const rankB = b.ranks[camelKey as keyof RankingInfo];

    // Handle null values (if any)
    if (rankA === null) return 1;
    if (rankB === null) return -1;

    return (rankA as number) - (rankB as number);
  }).slice(0, 3);

  // Arrange podium positions with 2nd, 1st, 3rd order for display
  const podiumOrder = sortedRankings.map((user, index) => {
    let displayOrder;
    if (index === 0) displayOrder = 1; // 1st place in middle
    else if (index === 1) displayOrder = 0; // 2nd place on left
    else displayOrder = 2; // 3rd place on right

    return {
      user,
      rank: index + 1,
      displayOrder,
    };
  }).sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold mb-6 text-center">{title}</h2>
      <div className="flex flex-col md:flex-row justify-center items-start gap-4">
        {podiumOrder.map((item) => {
          // Determine class name based on rank
          let positionClass = '';
          if (item.rank === 1) {
            positionClass = 'order-2 mt-0 md:mt-0'; // 1st place in middle
          } else if (item.rank === 2) {
            positionClass = 'order-1 mt-0 md:mt-8'; // 2nd place on left
          } else {
            positionClass = 'order-3 mt-0 md:mt-16'; // 3rd place on right
          }

          // Determine title based on rank
          let rankTitle = '';
          if (item.rank === 1) {
            rankTitle = '1er';
          } else if (item.rank === 2) {
            rankTitle = '2ème';
          } else {
            rankTitle = '3ème';
          }

          return (
            <div
              key={item.user.user.id}
              className={`w-48 flex justify-center ${positionClass}`}
            >
              <PodiumPosition
                rank={item.rank}
                user={item.user.user}
                title={rankTitle}
                value={item.user.ranks[valueKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) as keyof RankingInfo]}
                valueFormatter={valueFormatter}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RankingsPage() {
  const { usersApi } = useApiClient();

  // Fetch rankings data
  const { data, isLoading, error } = useQuery({
    queryKey: ['rankings'],
    queryFn: () => usersApi.getUserRankingsApiV1StatsRankingsGet(),
  });

  // Format time duration (for response time)
  const formatDuration = (duration: string) => {
    if (!duration) return 'N/A';

    const parsedDuration = parse(duration);
    if (parsedDuration.years) {
      return `${parsedDuration.years} années`;
    }
    if (parsedDuration.weeks) {
      return `${parsedDuration.weeks} semaines`;
    }
    if (parsedDuration.days) {
      return `${parsedDuration.days} jours`;
    }
    if (parsedDuration.hours) {
      return `${parsedDuration.hours} heures`;
    }
    if (parsedDuration.minutes) {
      return `${parsedDuration.minutes} minutes`;
    }
    if (parsedDuration.seconds) {
      return `${parsedDuration.seconds} secondes`;
    }

    return 'N/A';
  };

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
          <div className="text-center py-8">Chargement des classements...</div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600">
            Une erreur est survenue lors du chargement des classements.
          </div>
        )}

        {data && data.rankings && data.rankings.length > 0 && (
          <>
            {/* Podium for most positive responses */}
            <Podium
              title="Podium des réponses positives"
              rankings={data.rankings}
              rankingKey="n_positive_responses_rank"
              valueKey="n_positive_responses"
              valueFormatter={(value) => `${value} réponses`}
            />

            {/* Podium for most responses */}
            <Podium
              title="Podium des réponses totales"
              rankings={data.rankings}
              rankingKey="n_responses_rank"
              valueKey="n_responses"
              valueFormatter={(value) => `${value} réponses`}
            />

            {/* Podium for fastest response time */}
            <Podium
              title="Podium des temps de réponse les plus rapides"
              rankings={data.rankings}
              rankingKey="avg_response_time_rank"
              valueKey="avg_response_time"
              valueFormatter={formatDuration}
            />
          </>
        )}

        {data && data.rankings && data.rankings.length === 0 && (
          <div className="text-center py-8">
            Aucun classement disponible pour le moment.
          </div>
        )}
      </Container>
    </>
  );
}
