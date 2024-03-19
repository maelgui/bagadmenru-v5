import { useOidcIdToken } from '@axa-fr/react-oidc';
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
import EventListItem from './events/components/event';
import FileItem from './files/components/file-item';

export default function HomePage() {
  const { idTokenPayload } = useOidcIdToken();
  const { eventsApi, filesApi, usersApi } = useApiClient();

  const today = new Date();

  const { data: nextEvents } = useQuery({
    queryKey: ['events', 'next3'],
    queryFn: () => eventsApi.listEventsApiV1EventsGet({ limit: 3, dateGte: today }),
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
  const { data: stats } = useQuery({
    queryKey: ['stats', 'me'],
    queryFn: () => usersApi.getMyStatsApiV1StatsMeGet(),
  });

  return (
    <>
      <Header title={`Degemer mat ${idTokenPayload.name}`} />
      <Container>
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 content-stretch mb-16 mt-8">
            <Counter
              type="error"
              value={stats.responsesNeeded}
              description={`Vous devez répondre à ${stats.responsesNeeded} sortie${stats.responsesNeeded > 1 ? 's' : ''}`}
            />
            {(() => {
              if (!stats.avgResponseTime) { return null; }
              const days = parse(stats.avgResponseTime).days ?? 0;
              return (
                <Counter
                  type={days < 5 ? 'info' : 'warning'}
                  value={days ?? 0}
                  description={`Vous mettez en moyenne ${days} jours pour répondre aux sorties.`}
                />
              );
            })()}
          </div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 content-stretch">
          {calendarEvents ? (
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
          ) : null}
          {nextEvents ? (
            <div className="flex flex-col">
              <h3 className="text-lg whitespace-nowrap tracking-tight font-semibold uppercase mb-5">Prochains évènements</h3>
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
              <div className="mt-auto">
                <Link to="/events" className="whitespace-nowrap underline underline-offset-4 hover:decoration-2">
                  Accéder au doodle
                  <FontAwesomeIcon icon={faArrowRight} className="pl-2" />
                </Link>
              </div>
            </div>
          ) : null}
          {files ? (
            <div className="flex flex-col">
              <h3 className="text-lg whitespace-nowrap tracking-tight font-semibold uppercase mb-5">Derniers fichiers ajoutés</h3>
              <div className="flex flex-col gap-4 mb-5">
                {files.length ? files.map((file) => (
                  <FileItem key={file.id} file={file} noAction />
                )) : 'Aucun fichier ajouté récemment'}
              </div>
              <div className="mt-auto">
                <Link to="/files" className="whitespace-nowrap underline underline-offset-4 hover:decoration-2">
                  Accéder aux fichiers
                  <FontAwesomeIcon icon={faArrowRight} className="pl-2" />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </Container>
    </>
  );
}
