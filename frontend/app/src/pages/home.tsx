import { useOidcIdToken } from '@axa-fr/react-oidc';
import { faCheckCircle } from '@fortawesome/free-regular-svg-icons';
import {
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { FileOrFolderType } from 'bagad-client';
import { Link } from 'react-router-dom';
import { parse } from 'tinyduration';
import Alert from '../components/alert';
import Container from '../components/container';
import Counter from '../components/counter';
import Header from '../components/header';
import { useApiClient } from '../config/client';
import groupBy from '../utils/groupby';
import Calendar from './events/components/calendar';
import EventListItem, { EventListItemSkeleton } from './events/components/event';
import FileItem, { FileItemSkeleton } from './files/components/file-item';

export default function HomePage() {
  const { idTokenPayload } = useOidcIdToken();
  const { eventsApi, filesApi, usersApi } = useApiClient();

  const today = new Date();

  const { data: nextEvents } = useQuery({
    queryKey: ['events', 'next100'],
    queryFn: () => eventsApi.listEventsApiV1EventsGet({ limit: 10, dateGte: today }),
    select: (data) => data.slice(0, 3),
  });
  const { data: calendarEvents } = useQuery({
    queryKey: ['events', 'currentMonth'],
    queryFn: () => eventsApi.listEventsApiV1EventsGet({
      limit: 100,
      dateGte: new Date(today.getFullYear(), today.getMonth(), 0),
      dateLt: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    }),
  });
  const { data: files } = useQuery({
    queryKey: ['files'],
    queryFn: () => filesApi.listFilesApiV1FilesGet({ t: FileOrFolderType.File, limit: 5 }),
  });
  const { data: responses } = useQuery({
    queryKey: ['responses'],
    queryFn: () => eventsApi.listResponsesApiV1ResponsesGet({ userId: idTokenPayload.sub }),
    select: (data) => groupBy(data, (e) => e.eventId),
  });
  const { data: myStats } = useQuery({
    queryKey: ['stats', 'me'],
    queryFn: () => usersApi.getMyStatsApiV1StatsMeGet(),
  });
  const { data: globalStats } = useQuery({
    queryKey: ['stats', 'global'],
    queryFn: () => usersApi.getGlobalStatsApiV1StatsGet(),
  });

  return (
    <>
      <Header title={`Degemer mat ${idTokenPayload.name}`} />
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 content-stretch mb-16 mt-8">
          {myStats ? (
            <>
              <Counter
                type={myStats.responsesNeeded > 0 ? 'error' : 'success'}
                value={myStats.responsesNeeded > 0
                  ? myStats.responsesNeeded
                  : (<FontAwesomeIcon icon={faCheckCircle} />)}
                description={myStats.responsesNeeded > 0 ? `Vous devez répondre à ${myStats.responsesNeeded} sortie${myStats.responsesNeeded > 1 ? 's' : ''}` : 'Vous avez répondu à toutes les prochaines sorties !'}
              />
              {(() => {
                if (!myStats.avgResponseTime) { return null; }
                const days = parse(myStats.avgResponseTime).days ?? 0;
                return (
                  <Counter
                    type={days < 5 ? 'info' : 'warning'}
                    value={days ?? 0}
                    description={`Vous mettez en moyenne ${days} jours pour répondre aux sorties.`}
                  />
                );
              })()}
            </>
          ) : null}
          {globalStats ? (
            <Counter
              type="info"
              value={globalStats.nEvents}
              description={`Il y a ${globalStats.nEvents} sorties cette saison.`}
            />
          ) : null}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 content-stretch">
          <div className="flex flex-col">
            <h3 className="text-lg whitespace-nowrap tracking-tight font-semibold uppercase mb-5">Calendrier</h3>
            <div className="mb-5">
              <Calendar events={calendarEvents ?? []} />
            </div>
            <div className="mt-auto">
              <Link to="/events/calendar" className="whitespace-nowrap underline underline-offset-4 hover:decoration-2">
                Accéder au calendrier
                <FontAwesomeIcon icon={faArrowRight} className="pl-2" />
              </Link>
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg whitespace-nowrap tracking-tight font-semibold uppercase mb-5">Prochains évènements</h3>
            {nextEvents ? (
              <div>
                {!nextEvents.length ? (<Alert type="info">Aucun évènement à venir.</Alert>) : null}
                {nextEvents.slice(0, 4).map((event) => (
                  <div className="mb-5" key={event.id}>
                    <EventListItem
                      event={event}
                      response={responses?.get(event.id)?.at(0)?.value}
                      showResponse
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <EventListItemSkeleton />
              </div>
            )}
            <div className="mt-auto">
              <Link to="/events" className="whitespace-nowrap underline underline-offset-4 hover:decoration-2">
                Accéder au doodle
                <FontAwesomeIcon icon={faArrowRight} className="pl-2" />
              </Link>
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg whitespace-nowrap tracking-tight font-semibold uppercase mb-5">Derniers fichiers ajoutés</h3>
            {files ? (
              <div className="flex flex-col gap-4 mb-5">
                {files.length ? files.map((file) => (
                  <FileItem key={file.id} file={file} noAction />
                )) : 'Aucun fichier ajouté récemment'}
              </div>
            ) : (
              <div className="flex flex-col gap-4 mb-5">
                <FileItemSkeleton />
                <FileItemSkeleton />
                <FileItemSkeleton />
              </div>
            )}
            <div className="mt-auto">
              <Link to="/files" className="whitespace-nowrap underline underline-offset-4 hover:decoration-2">
                Accéder aux fichiers
                <FontAwesomeIcon icon={faArrowRight} className="pl-2" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
