import { useOidcIdToken } from '@axa-fr/react-oidc';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { FileOrFolderType } from 'bagad-client';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../components/container';
import Header from '../components/header';
import { useApiClient } from '../config/client';
import EventListItem from './events/components/event';
import FileItem from './files/components/file-item';

export default function HomePage() {
  const navigate = useNavigate();
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
            {events.length ? events.map((event) => (
              <div key={event.id} className="flex">
                <div className="flex-1">
                  <EventListItem event={event} />
                </div>
                <div className="flex-1">
                  <h6>Serez-vous présent ?</h6>
                  <button type="button">Oui</button>
                  <button type="button">Non</button>
                </div>
              </div>
            )) : 'Pas d\'évènements à venir'}
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
      <button type="button" onClick={() => navigate('/profile')}>
        My Profile
      </button>
    </>
  );
}
