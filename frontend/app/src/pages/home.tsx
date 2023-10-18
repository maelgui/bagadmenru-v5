import { useOidcIdToken } from '@axa-fr/react-oidc';
import {
  faArrowRight, faCircleCheck, faCircleXmark, faWarning,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { FileOrFolderType } from 'bagad-client';
import { Link } from 'react-router-dom';
import Container from '../components/container';
import Header from '../components/header';
import { useApiClient } from '../config/client';
import groupBy from '../utils/groupby';
import EventListItem from './events/components/event';
import FileItem from './files/components/file-item';

export default function HomePage() {
  const { idTokenPayload } = useOidcIdToken();
  const { eventsApi, filesApi } = useApiClient();

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.listEventsApiV1EventsGet(),
  });
  const { data: files } = useQuery({
    queryKey: ['files'],
    queryFn: () => filesApi.listFilesApiV1FilesGet({ t: FileOrFolderType.File }),
  });
  const { data: responses } = useQuery({
    queryKey: ['responses'],
    queryFn: () => eventsApi.listResponsesApiV1ResponsesGet({ userId: idTokenPayload.sub }),
    select: (data) => groupBy(data, (e) => e.eventId),
  });

  return (
    <>
      <Header title={`Hi ${idTokenPayload.name}`} />
      <Container>
        {events ? (
          <div className="p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-2 justify-between pb-8">
              <h3 className="text-lg whitespace-nowrap tracking-tight font-semibold uppercase">Prochains évènements</h3>
              <Link to="/events/doodle" className="whitespace-nowrap underline underline-offset-4 hover:decoration-2">
                Accéder au doodle
                <FontAwesomeIcon icon={faArrowRight} className="pl-2" />
              </Link>
            </div>
            <div className="flex flex-col divide-y">

              {events.length ? events.map((event) => (
                <div key={event.id} className="flex flex-col md:flex-row md:items-center p-4 gap-4">
                  <div className="flex-1">
                    <EventListItem event={event} />
                  </div>
                  <div className="flex-1">
                    {
                      (() => {
                        const value = responses?.get(event.id)?.at(0)?.value;
                        if (value === undefined) {
                          return (
                            <>
                              <FontAwesomeIcon icon={faWarning} className="text-amber-300" />
                              {' '}
                              Vous n&apos;avez pas répondu
                            </>
                          );
                        }
                        if (value) {
                          return (
                            <div>
                              <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-300" />
                              {' '}
                              Vous serez présent
                            </div>
                          );
                        }

                        return (
                          <>
                            <FontAwesomeIcon icon={faCircleXmark} className="text-red-300" />
                            {' '}
                            Vous ne serez pas présent
                          </>
                        );
                      })()
                    }
                    {responses?.get(event.id)?.at(0) === undefined ? (
                      <>
                        <h6>Serez-vous présent ?</h6>
                        <button type="button">Oui</button>
                        {' '}
                        |
                        {' '}
                        <button type="button">Non</button>

                      </>
                    ) : null}
                  </div>
                </div>
              )) : 'Pas d\'évènements à venir'}
            </div>

          </div>
        ) : null}
        {files ? (
          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-2 justify-between pb-8">
              <h3 className="text-lg whitespace-nowrap tracking-tight font-semibold uppercase">Derniers fichiers ajoutés</h3>
              <Link to="/files" className="whitespace-nowrap underline underline-offset-4 hover:decoration-2">
                Parcourir
                <FontAwesomeIcon icon={faArrowRight} className="pl-2" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {files.length ? files.map((file) => (
                <FileItem key={file.id} file={file} />
              )) : 'Aucun fichier ajouté récemment'}
            </div>
          </div>
        ) : null}
      </Container>
    </>
  );
}
