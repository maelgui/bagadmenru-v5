/* eslint-disable max-len */
import { useOidcIdToken } from '@axa-fr/react-oidc';
import {
  faFloppyDisk,
  faPen,
  faPlusCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Costume, Response, ResponseCreate } from 'bagad-client';
import { useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { eventsApi, queryClient, usersApi } from '../../client';
import Checkbox from '../../components/checkbox';
import Header from '../../components/header';
import Tooltip from '../../components/tooltip';
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

async function responsesQuery() {
  const responses = await eventsApi.listResponsesApiV1ResponsesGet();
  const responsesByUserAndEvent = groupby(responses, (r) => keyFunc(r.eventId, r.userId));
  const responsesSumByEvent = sumByEvents(responses);
  return {
    responsesByUserAndEvent, responsesSumByEvent,
  };
}

export default function DoodlePage() {
  const { idTokenPayload } = useOidcIdToken();

  const [editing, setEditing] = useState<boolean>(false);

  const { data: events } = useQuery('events', () => eventsApi.listEventsApiV1EventsGet());
  const { data: profiles } = useQuery('profiles', () => usersApi.listProfilesApiV1ProfilesGet());
  const { data: responses } = useQuery('responses', responsesQuery);

  const mutation = useMutation({
    mutationFn: ({ eventId, response }: { eventId: number, response: ResponseCreate }) => {
      const params = { eventId: eventId.toString(), responseCreate: response };
      return eventsApi.createResponseApiV1EventsEventIdResponsesPut(params);
    },
    onMutate: async (newTodo) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['responses'] });

      // Snapshot the previous value
      const previousResponses = queryClient.getQueryData(['responses']);

      // Optimistically update to the new value
      queryClient.setQueryData(['responses'], (old: Response[]) => [...old, newTodo]);

      // Return a context object with the snapshotted value
      return { previousTodos: previousResponses };
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['todos'], context.previousTodos);
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return (
    <>
      <Header
        title="Doodle"
        subtitle="Mes présences aux évènements du groupe"
        actions={[
          <Header.Action key="add-event">
            <FontAwesomeIcon icon={faPlusCircle} />
            {' '}
            Ajouter
          </Header.Action>,
        ]}
      />

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
  );
}
