/* eslint-disable max-len */
import { useOidcIdToken } from '@axa-fr/react-oidc';
import {
  faCalendar,
  faCalendarPlus,
  faFloppyDisk,
  faPen,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Costume, Response, ResponseCreate } from 'bagad-client';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import Alert from '../../components/alert';
import Badge from '../../components/badge';
import Container from '../../components/container';
import Header from '../../components/header';
import Tooltip from '../../components/tooltip';
import { queryClient, useApiClient } from '../../config/client';
import EventCategories from '../../utils/event-category';
import groupby from '../../utils/groupby';
import Checkbox from './components/checkbox';

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
}

function responseFormat(responses: Response[]): ResponsesData {
  const responsesByUserAndEvent = groupby(responses, (r) => keyFunc(r.eventId, r.userId));
  const responsesSumByEvent = sumByEvents(responses);
  return {
    responsesByUserAndEvent, responsesSumByEvent,
  };
}

export default function DoodlePage() {
  const { idTokenPayload } = useOidcIdToken();
  const { usersApi, eventsApi } = useApiClient();

  const [editing, setEditing] = useState<boolean>(false);

  const { data: events } = useQuery({ queryKey: ['events', 'next100'], queryFn: () => eventsApi.listEventsApiV1EventsGet({ limit: 100, dateGte: new Date() }) });
  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: () => usersApi.listProfilesApiV1ProfilesGet() });
  const { data: responses } = useQuery({ queryKey: ['responses'], queryFn: () => eventsApi.listResponsesApiV1ResponsesGet(), select: (data) => responseFormat(data) });

  const mutation = useMutation({
    mutationFn: ({ eventId, response }: { eventId: number, response: ResponseCreate }) => {
      const params = { eventId, responseCreate: response };
      return eventsApi.createResponseApiV1EventsEventIdResponsesPut(params);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['responses'] }),
    onSuccess: (data) => toast.success(() => (
      <span>
        Réponse enregistrée pour
        {' '}
        <i>
          Event#
          {data.eventId}
        </i>
      </span>
    )),
  });

  return (
    <>
      <Header
        title="Doodle"
        subtitle="Mes présences aux évènements du groupe"
        actions={[
          <Header.Action variant="outline" key="add-event" as={Link} to="/events/manage">
            <FontAwesomeIcon icon={faCalendarPlus} />
            {' '}
            Gérer
          </Header.Action>,
          <Header.Action key="doodle-nav" as={Link} to="/events/calendar">
            <FontAwesomeIcon icon={faCalendar} />
            {' '}
            Vue calendrier
          </Header.Action>,

        ]}
        breadcrumb={[
          { link: '/events', title: 'Évènements' },
          { title: 'Mes présences' },
        ]}
      />
      <Container className={`${mutation.isPending ? 'disabled' : ''}`}>
        {!events?.length ? (
          <Alert type="info">Aucun évèvement prochainement.</Alert>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto min-w-full">
              <thead className="divide-y">
                <tr className="divide-x">
                  <td>{' '}</td>
                  {events && events.map((event) => (
                    <td key={event.id} className="text-center px-4">
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

                    </td>
                  ))}
                </tr>
                <tr className="divide-x">
                  <td>{' '}</td>
                  {events && events.map((event) => (
                    <td key={event.id} className="text-center whitespace-nowrap  px-4 text-sm">
                      <Badge color="bg-gray-400" className="m-1">
                        {(responses && responses.responsesSumByEvent.get(event.id)) ?? 0}
                        {' '}
                        présents
                      </Badge>
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles && profiles.map((user) => (
                  <tr key={user.id}>
                    <th className={`text-right whitespace-nowrap ${idTokenPayload.sub === user.id ? 'font-bold' : 'font-normal'}`}>{`${user.firstName} ${user.lastName}`}</th>
                    {events && events.map((event) => {
                      const value = responses?.responsesByUserAndEvent.get(keyFunc(event.id, user.id))?.at(0)?.value;
                      return (
                        <Checkbox
                          key={`${user.id}-${event.id}`}
                          disabled={idTokenPayload.sub === user.id ? !editing : true}
                          value={value}
                          onClick={() => mutation.mutate({ eventId: event.id, response: { value: !value } })}
                        />
                      );
                    })}

                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="w-16 h-16 shadow-md shadow-white text-white bg-pourpre-500 rounded-full absolute right-8 bottom-8"
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
