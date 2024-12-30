import { faCheckCircle } from '@fortawesome/free-regular-svg-icons';
import {
  faArrowRight,
  faCalendarDay,
  faCameraRetro,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { FileOrFolderType } from 'bagad-client';
import { Link } from 'react-router-dom';
import { parse } from 'tinyduration';
import Alert from '../../components/alert';
import Button from '../../components/button';
import Container from '../../components/container';
import Counter from '../../components/counter';
import Header from '../../components/header';
import { useApiClient, usePermissions, useUserProfile } from '../../config/client';
import groupBy from '../../utils/groupby';
import Calendar from '../events/components/calendar';
import EventListItem, { EventListItemSkeleton } from '../events/components/event';
import FileItem, { FileItemSkeleton } from '../files/components/file-item';
import Mailbox from './components/mailbox';

export default function HomePage() {
  const { eventsApi, filesApi, usersApi } = useApiClient();
  const profile = useUserProfile();
  const { can } = usePermissions();

  const today = new Date();

  const { data: nextEvents } = useQuery({
    queryKey: ['events', 'next100'],
    queryFn: () => eventsApi.listEventsApiV1EventsGet({ limit: 10, dateGte: today }),
    select: (data) => data.slice(0, 3),
    enabled: can('view', 'event'),
  });
  const { data: calendarEvents } = useQuery({
    queryKey: ['events', 'currentMonth'],
    queryFn: () => eventsApi.listEventsApiV1EventsGet({
      limit: 100,
      dateGte: new Date(today.getFullYear(), today.getMonth(), 0),
      dateLt: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    }),
    enabled: can('view', 'event'),
  });
  const { data: files } = useQuery({
    queryKey: ['files'],
    queryFn: () => filesApi.listFilesApiV1FilesGet({ t: FileOrFolderType.File, limit: 5 }),
    enabled: can('view', 'file'),
  });
  const { data: responses } = useQuery({
    queryKey: ['responses', 'me'],
    queryFn: () => eventsApi.listResponsesApiV1ResponsesGet({ userId: profile?.id }),
    select: (data) => groupBy(data, (e) => e.eventId),
    enabled: can('create', 'response'),
  });
  const { data: myStats } = useQuery({
    queryKey: ['stats', 'me'],
    queryFn: () => usersApi.getMyStatsApiV1StatsMeGet(),
    enabled: can('create', 'response'),
  });
  const { data: globalStats } = useQuery({
    queryKey: ['stats', 'global'],
    queryFn: () => usersApi.getGlobalStatsApiV1StatsGet(),
  });

  return (
    <>
      <Header title={`Degemer mat ${profile?.firstName}`} />
      <Container>
        <Alert type="info" style={{ backgroundImage: 'linear-gradient(to right, #ffe3f3, #f5e0f8, #e7dffd, #d5dfff, #c1dfff)' }}>
          <p className="py-4 font-semibold">
            Bienvenue sur le nouveau site du Bagad Men Ru.
            C&apos;est pareil qu&apos;avant, mais en plus joli.
          </p>
          <p className="pb-4">
            Voici quelques nouveautés :
            <ul className="list-disc ml-8">
              <li>
                Une page d&apos;accueil qui contient les principales
                informations dont vous pourriez avoir besoin.
              </li>
              <li>
                Un calendrier amélioré, avec tous types d&apos;évènements
                dedans. Allez y faire un tour !
              </li>
              <li>Des photos de profil, comme ça les nouveaux adhérents ne sont pas perdus</li>
            </ul>
          </p>
          <p className="pb-4">
            N&apos;hésitez pas à faire des retours et à signaler ce qui ne fonctionne pas !
          </p>
          <p className="pb-2">
            <Button as={Link} to="/profile/edit/me" variant="ghost" icon={faCameraRetro}>Ajouter ma photo</Button>
            <Button as={Link} to="/events/calendar" variant="ghost" icon={faCalendarDay}>Voir le calendrier</Button>
          </p>
        </Alert>
        {can('view', 'email') ? <Mailbox /> : null}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 content-stretch mb-16 mt-8">
          {myStats && globalStats ? (
            <>
              <Link to="/events">
                <Counter
                  className="h-full"
                  type={globalStats.nUpcomingEvent - myStats.nUpcommingResponses > 0 ? 'error' : 'success'}
                  value={globalStats.nUpcomingEvent - myStats.nUpcommingResponses > 0
                    ? globalStats.nUpcomingEvent - myStats.nUpcommingResponses
                    : (<FontAwesomeIcon icon={faCheckCircle} />)}
                  description={globalStats.nUpcomingEvent - myStats.nUpcommingResponses > 0 ? `Vous devez répondre à ${globalStats.nUpcomingEvent - myStats.nUpcommingResponses} sortie${globalStats.nUpcomingEvent - myStats.nUpcommingResponses > 1 ? 's' : ''}` : 'Vous avez répondu à toutes les prochaines sorties !'}
                />
              </Link>
              {(() => {
                if (!myStats.avgResponseTime) { return null; }
                const days = parse(myStats.avgResponseTime).days ?? 0;
                return (
                  <Counter
                    type={days < 5 ? 'ghost' : 'warning'}
                    value={days ?? 0}
                    description={`Vous mettez en moyenne ${days} jours pour répondre aux sorties.`}
                  />
                );
              })()}
              <Counter
                type="ghost"
                value={globalStats.nEvents}
                description={`Il y a ${globalStats.nEvents} sorties cette saison.`}
              />
            </>
          ) : null}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 content-stretch">
          {can('view', 'event') ? (
            <>
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
                          showResponse={can('create', 'response')}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <EventListItemSkeleton />
                  </div>
                )}
                {can('create', 'response') ? (
                  <div className="mt-auto">
                    <Link to="/events" className="whitespace-nowrap underline underline-offset-4 hover:decoration-2">
                      Accéder au doodle
                      <FontAwesomeIcon icon={faArrowRight} className="pl-2" />
                    </Link>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
          {can('view', 'file') ? (
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
          ) : null}
        </div>
      </Container>
    </>
  );
}
