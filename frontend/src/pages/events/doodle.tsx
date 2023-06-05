/* eslint-disable max-len */
import { useOidcIdToken } from '@axa-fr/react-oidc';
import {
  faFloppyDisk,
  faPen,
  faPlusCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import {
  Costume,
  Event,
  EventsService, Profile,
  Response,
  UsersService,
} from '../../client';
import Checkbox from '../../components/checkbox';
import Header from '../../components/header';
import Tooltip from '../../components/tooltip';

function groupByUserAndEvents(list: Response[]) {
  const map = new Map<string, Map<number, Response>>();
  list.forEach((item) => {
    const key = item.user_id;
    if (!map.has(key)) {
      map.set(key, new Map<number, Response>());
    }
    map.get(key)?.set(item.event_id, item);
  });
  return map;
}

function sumByEvents(list: Response[]) {
  const map = new Map<number, number>();
  list.forEach((item) => {
    const key = item.event_id;
    map.set(key, (map.get(key) ?? 0) + (item.value ? 1 : 0));
  });
  return map;
}

interface DoodleData {
  events: Event[]
  profiles: Profile[]
  responsesByUserAndEvent: Map<string, Map<number, Response>>
  responsesSumByEvent: Map<number, number>
}

export async function doodleDataLoader(): Promise<DoodleData> {
  const events = await EventsService.listEventsApiV1EventsGet();
  const responses = await EventsService.listResponsesApiV1ResponsesGet();
  const profiles = await UsersService.listProfilesApiV1ProfilesGet();
  const responsesByUserAndEvent = groupByUserAndEvents(responses);
  const responsesSumByEvent = sumByEvents(responses);
  return {
    events, profiles, responsesByUserAndEvent, responsesSumByEvent,
  };
}

export async function doodleAction({ request, params }) {
  const formData = await request.formData();
  await EventsService.createResponseApiV1EventsEventIdResponsesPut(formData.get('eventId'), { value: formData.get('value') });
  return null;
}

export default function DoodlePage() {
  const [editing, setEditing] = useState<boolean>(false);
  const data = useLoaderData() as DoodleData;
  const { idTokenPayload } = useOidcIdToken();

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
            {data.events.map((event) => (
              <td key={event.id} className="text-center px-4">
                <Tooltip
                  content={(
                    <span>
                      {event.description !== '' ? event.description : 'Pas de description'}
                      {event.costume !== Costume.NONE && (
                        <span>
                          <br />
                          {event.costume === Costume.POLO ? 'En costume !' : 'En polo !'}
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
            {data.events.map((event) => (
              <td key={event.id} className="text-center whitespace-nowrap  px-4 text-sm">
                <span className="rounded-full bg-gray-400 text-white px-2">
                  {data.responsesSumByEvent.get(event.id) ?? 0}
                  {' '}
                  présents

                </span>
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.profiles.map((user) => (
            <tr key={user.id}>
              <th className={`text-right ${idTokenPayload.sub === user.id ? 'font-bold' : 'font-normal'}`}>{user.name}</th>
              {data.events.map((event) => (
                <Checkbox
                  key={`${user.id}-${event.id}`}
                  disabled={idTokenPayload.sub === user.id ? !editing : true}
                  value={data.responsesByUserAndEvent.get(user.id)?.get(event.id)?.value}
                  eventId={event.id}
                />
              ))}

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
