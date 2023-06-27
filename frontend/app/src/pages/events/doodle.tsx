/* eslint-disable max-len */
import { useOidcIdToken } from '@axa-fr/react-oidc';
import {
  faFloppyDisk,
  faPen,
  faPlusCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Costume, Response, ResponseCreate } from 'bagad-client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../../components/alert';
import Checkbox from '../../components/checkbox';
import Header from '../../components/header';
import Tooltip from '../../components/tooltip';
import { eventsApi, queryClient, usersApi } from '../../config/client';
import groupby from '../../utils/groupby';

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

async function responsesQuery(): Promise<ResponsesData> {
  const responses = await eventsApi.listResponsesApiV1ResponsesGet();
  const responsesByUserAndEvent = groupby(responses, (r) => keyFunc(r.eventId, r.userId));
  const responsesSumByEvent = sumByEvents(responses);
  return {
    responsesByUserAndEvent, responsesSumByEvent,
  };
}

export default function DoodlePage() {
  const { idTokenPayload } = useOidcIdToken();
  const navigate = useNavigate();

  const [editing, setEditing] = useState<boolean>(false);

  const { data: events } = useQuery({ queryKey: ['events'], queryFn: () => eventsApi.listEventsApiV1EventsGet() });
  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: () => usersApi.listProfilesApiV1ProfilesGet() });
  const { data: responses } = useQuery({ queryKey: ['responses'], queryFn: responsesQuery });

  const mutation = useMutation({
    mutationFn: ({ eventId, response }: { eventId: number, response: ResponseCreate }) => {
      const params = { eventId: eventId.toString(), responseCreate: response };
      return eventsApi.createResponseApiV1EventsEventIdResponsesPut(params);
    },
    onMutate: async ({ eventId, response }) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['responses'] });

      // Snapshot the previous value
      const previousResponses = queryClient.getQueryData<ResponsesData>(['responses']);

      // Optimistically update to the new value
      queryClient.setQueryData(['responses'], (data: ResponsesData | undefined) => {
        let data2 = data;
        if (data2) {
          data2.responsesByUserAndEvent.set(keyFunc(eventId, idTokenPayload.sub), [{
            eventId,
            userId: idTokenPayload.sub,
            value: response.value,
            date: new Date(),
          }]);
        } else {
          data2 = { responsesByUserAndEvent: new Map<string, Response[]>(), responsesSumByEvent: new Map<number, number>() };
        }
        return data2;
      });

      // Return a context object with the snapshotted value
      return { previousResponses };
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (err, newTodo, context) => {
      console.error(err, newTodo);
      queryClient.setQueryData(['responses'], context?.previousResponses);
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] });
    },
  });

  return (
    <>
      <Header
        title="Doodle"
        subtitle="Mes présences aux évènements du groupe"
        actions={[
          <Header.Action key="add-event" onClick={() => navigate('/events/add')}>
            <FontAwesomeIcon icon={faPlusCircle} />
            {' '}
            Ajouter
          </Header.Action>,
        ]}
      />

      {!events ? (
        <Alert type="error">Aucun évèvement prochainement.</Alert>
      ) : (
        <>
          <table className="table-auto min-w-full">
            <thead className="divide-y">
              <tr className="divide-x">
                <td />
                {events && events.map((event) => (
                  <td key={event.id} className="text-center px-4">
                    <Tooltip
                      content={(
                        <span>
                          {event.description !== '' ? event.description : 'Pas de description'}
                          {event.costume !== Costume.None && (
                            <span>
                              <br />
                              {event.costume === Costume.Polo ? 'En costume !' : 'En polo !'}
                            </span>
                          )}
                        </span>
                      )}
                    >
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
                <td />
                {events && events.map((event) => (
                  <td key={event.id} className="text-center whitespace-nowrap  px-4 text-sm">
                    <span className="rounded-full bg-gray-400 text-white px-2">
                      {(responses && responses.responsesSumByEvent.get(event.id)) ?? 0}
                      {' '}
                      présents

                    </span>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles && profiles.map((user) => (
                <tr key={user.id}>
                  <th className={`text-right ${idTokenPayload.sub === user.id ? 'font-bold' : 'font-normal'}`}>{user.name}</th>
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
        </>
      )}
    </>
  );
}
