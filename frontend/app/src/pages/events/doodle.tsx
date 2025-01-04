/* eslint-disable jsx-a11y/control-has-associated-label */
/* eslint-disable max-len */
import {
  faCalendarPlus,
  faFloppyDisk,
  faPen,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Costume, Response, ResponseCreate } from 'bagad-client';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Link, Navigate,
  useSearchParams,
} from 'react-router-dom';
import Alert from '../../components/alert';
import Avatar from '../../components/avatar';
import Badge from '../../components/badge';
import Container from '../../components/container';
import Header from '../../components/header';
import { SkeletonImage, SkeletonText } from '../../components/skeleton';
import Tooltip from '../../components/tooltip';
import {
  queryClient, useApiClient,
  usePermissions,
  useUserProfile,
} from '../../config/client';
import EventCategories from '../../utils/event-category';
import groupby from '../../utils/groupby';
import Checkbox from './components/checkbox';
import DisplaySelector from './components/selector';

function sumByEvents(list: Response[]) {
  const map = new Map<number, number>();
  list.forEach((item) => {
    const key = item.eventId;
    map.set(key, (map.get(key) ?? 0) + (item.value ? 1 : 0));
  });
  return map;
}

function keyFunc(eventId: number, userId: string) {
  return `userId:${userId}|eventId:${eventId}`;
}

interface ResponsesData {
  responsesByUserAndEvent: Map<string, Response[]>;
  responsesSumByEvent: Map<number, number>;
  existingUsers: Set<string>;
}

function responseFormat(responses: Response[]): ResponsesData {
  const existingUsers = new Set(responses.map((r) => r.userId));
  const responsesByUserAndEvent = groupby(responses, (r) => keyFunc(r.eventId, r.userId));
  const responsesSumByEvent = sumByEvents(responses);
  return {
    responsesByUserAndEvent, responsesSumByEvent, existingUsers,
  };
}

export default function DoodlePage() {
  const { usersApi, eventsApi } = useApiClient();
  const profile = useUserProfile();

  const [searchParams] = useSearchParams();
  const [editing, setEditing] = useState<boolean>(false);

  const { data: events } = useQuery({
    queryKey: ['events', 'next100doodle'],
    queryFn: () => eventsApi.listEventsApiV1EventsGet({ limit: 100, dateGte: new Date(), isInDoodle: true }),
  });
  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: () => usersApi.listProfilesApiV1ProfilesGet() });
  const { data: responses } = useQuery({ queryKey: ['responses'], queryFn: () => eventsApi.listResponsesApiV1ResponsesGet(), select: (data) => responseFormat(data) });

  const mutation = useMutation({
    mutationFn: ({ eventId, response }: { eventId: number, response: ResponseCreate }) => {
      const params = { eventId, responseCreate: response };
      return eventsApi.createResponseApiV1EventsEventIdResponsesPut(params);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['responses'] }),
    onSuccess: () => toast.success('Réponse enregistrée'),
  });

  const { can } = usePermissions();

  if (!searchParams.get('noRedirect') && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    // true for mobile device
    return <Navigate to="/events/planning" />;
  }

  return (
    <>
      <Header
        title="Doodle"
        subtitle="Mes présences aux évènements du groupe"
        actions={[
          <Header.Action variant="outline" icon={faCalendarPlus} key="add-event" as={Link} to="/events/manage" className={can('edit', 'event') ? '' : 'hidden'}>
            Gérer
          </Header.Action>,
          <DisplaySelector key="doodle-nav" />,
        ]}
        breadcrumb={[
          { link: '/events', title: 'Évènements' },
          { title: 'Doodle' },
        ]}
      />
      <Container className={`${mutation.isPending ? 'disabled' : ''}`}>
        {!events?.length ? (
          <Alert type="info">Aucun évèvement prochainement.</Alert>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto min-w-full relative">
              <thead className="divide-y sticky top-0">
                <tr className="divide-x">
                  <th className="bg-white">{' '}</th>
                  {events ? events.map((event) => (
                    <th key={event.id} className="text-center px-4 bg-white">
                      <Tooltip
                        content={(
                          <span>
                            {event.description !== '' ? event.description : 'Pas de description'}
                            {event.costume !== Costume.None && (
                              <span>
                                <br />
                                {event.costume === Costume.Costume ? 'En costume !' : 'En polo !'}
                              </span>
                            )}
                          </span>
                        )}
                      >
                        <div className="p-1">
                          <Badge color={EventCategories[event.category]?.bg ?? 'bg-gray-500'}>{EventCategories[event.category]?.name ?? event.category}</Badge>
                        </div>
                        <strong>{event.title}</strong>
                        <br />
                        <span className="text-sm">
                          {(new Date(event.date)).toLocaleDateString('fr-FR', {
                            weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
                          })}
                        </span>
                      </Tooltip>

                    </th>
                  )) : (
                    <>
                      <th className="text-center px-4">
                        <strong><SkeletonText className="w-24" /></strong>
                        <br />
                        <span className="text-sm">
                          <SkeletonText className="w-32" />
                        </span>
                      </th>
                      <th className="text-center px-4">
                        <strong><SkeletonText className="w-24" /></strong>
                        <br />
                        <span className="text-sm">
                          <SkeletonText className="w-32" />
                        </span>
                      </th>
                      <th className="text-center px-4">
                        <strong><SkeletonText className="w-24" /></strong>
                        <br />
                        <span className="text-sm">
                          <SkeletonText className="w-32" />
                        </span>
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                <tr className="divide-x">
                  <td>{' '}</td>
                  {events ? events.map((event) => (
                    <td key={event.id} className="text-center whitespace-nowrap  px-4 text-sm">
                      <Badge color="bg-gray-400" className="m-1">
                        {(responses && responses.responsesSumByEvent.get(event.id)) ?? 0}
                        {' '}
                        présents
                      </Badge>
                    </td>
                  )) : (
                    <>
                      <td className="text-center whitespace-nowrap  px-4 text-sm">
                        <Badge color="bg-gray-400" className="m-1 w-16">{' '}</Badge>
                      </td>
                      <td className="text-center whitespace-nowrap  px-4 text-sm">
                        <Badge color="bg-gray-400" className="m-1 w-16">{' '}</Badge>
                      </td>
                      <td className="text-center whitespace-nowrap  px-4 text-sm">
                        <Badge color="bg-gray-400" className="m-1 w-16">{' '}</Badge>
                      </td>
                    </>
                  )}
                </tr>
                {profiles ? profiles.filter((p) => p.id === profile?.id || responses?.existingUsers.has(p.id)).map((user) => (
                  <tr key={user.id}>
                    <th className={`text-right whitespace-nowrap ${profile?.id === user.id ? 'font-bold' : 'font-normal'} flex justify-end items-center h-8`}>
                      <Avatar src={user.pictureUrl} size="sm" className="rounded-full border-2 w-6 h-6 mr-2" style={{ borderColor: user.instrument?.color ?? '' }} />
                      <span>{`${user.firstName} ${user.lastName.slice(0, 1)}`}</span>
                    </th>
                    {events && events.map((event) => {
                      const value = responses?.responsesByUserAndEvent.get(keyFunc(event.id, user.id))?.at(0)?.value;
                      return (
                        <Checkbox
                          key={`${user.id}-${event.id}`}
                          disabled={profile?.id === user.id ? !editing : true}
                          value={value}
                          onClick={() => mutation.mutate({ eventId: event.id, response: { value: !value } })}
                        />
                      );
                    })}

                  </tr>
                )) : (
                  <tr>
                    <th className="text-right flex justify-end items-center">
                      <SkeletonImage className="w-8 h-8 mr-2" />
                      <SkeletonText className="w-24" />
                    </th>
                    <td />
                    <td />
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
            <button
              type="button"
              className="w-16 h-16 shadow-md shadow-white text-white bg-pourpre-500 rounded-full fixed right-8 bottom-8"
              onClick={() => setEditing(!editing)}
            >
              {editing ? <FontAwesomeIcon icon={faFloppyDisk} /> : <FontAwesomeIcon icon={faPen} />}
            </button>
          </div>
        )}
      </Container>
    </>
  );
}
