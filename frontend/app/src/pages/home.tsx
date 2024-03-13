import { useOidcIdToken } from '@axa-fr/react-oidc';
import {
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { FileOrFolderType } from 'bagad-client';
import { Link } from 'react-router-dom';
import Alert from '../components/alert';
import Container from '../components/container';
import Header from '../components/header';
import { useApiClient } from '../config/client';
import groupBy from '../utils/groupby';
import Calendar from './events/components/calendar';
import EventListItem from './events/components/event';
import FileItem from './files/components/file-item';

export default function HomePage() {
  const { idTokenPayload } = useOidcIdToken();
  const { eventsApi, filesApi } = useApiClient();

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.listEventsApiV1EventsGet({ limit: 10 }),
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

  return (
    <>
      <Header title={`Degemer mat ${idTokenPayload.name}`} />
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 content-stretch">
          {events ? (
            <>
              <div className="flex flex-col">
                <h3 className="text-lg whitespace-nowrap tracking-tight font-semibold uppercase mb-5">Calendrier</h3>
                <div className="mb-5">
                  <Calendar events={events ?? []} />
                </div>
                <Link to="/events/calendar" className="whitespace-nowrap underline underline-offset-4 hover:decoration-2 mt-auto">
                  Accéder au calendrier
                  <FontAwesomeIcon icon={faArrowRight} className="pl-2" />
                </Link>
              </div>
              <div>
                <h3 className="text-lg whitespace-nowrap tracking-tight font-semibold uppercase mb-5">Prochains évènements</h3>
                <div>
                  {!events.length ? (<Alert type="info">Aucun évènement à venir.</Alert>) : null}
                  {events.slice(0, 4).map((event) => (
                    <div className="mb-5" key={event.id}>
                      <EventListItem
                        event={event}
                        response={responses?.get(event.id)?.at(0)?.value}
                        showResponse
                      />
                    </div>
                  ))}
                </div>
                <Link to="/events/doodle" className="whitespace-nowrap underline underline-offset-4 hover:decoration-2">
                  Accéder au doodle
                  <FontAwesomeIcon icon={faArrowRight} className="pl-2" />
                </Link>
              </div>
            </>
          ) : null}
          {files ? (
            <div className="flex flex-col">
              <h3 className="text-lg whitespace-nowrap tracking-tight font-semibold uppercase mb-5">Derniers fichiers ajoutés</h3>
              <div className="flex flex-col gap-4 mb-5">
                {files.length ? files.map((file) => (
                  <FileItem key={file.id} file={file} />
                )) : 'Aucun fichier ajouté récemment'}
              </div>
              <Link to="/files" className="whitespace-nowrap underline underline-offset-4 hover:decoration-2 mt-auto">
                Accéder aux fichiers
                <FontAwesomeIcon icon={faArrowRight} className="pl-2" />
              </Link>
            </div>
          ) : null}
        </div>
      </Container>
    </>
  );
}
