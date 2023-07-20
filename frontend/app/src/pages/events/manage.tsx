import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Badge from '../../components/badge';
import Header from '../../components/header';
import { eventsApi } from '../../config/client';

export default function ManageEventsPage() {
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: () => eventsApi.listEventsApiV1EventsGet() });

  return (
    <div>
      <Header
        title="Doodle"
        subtitle="Mes présences aux évènements du groupe"
      />
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th />
            <th>Date</th>
            <th>Description</th>
            <th>Custom</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events && events.map((event) => (
            <tr key={event.id}>
              <td>
                #
                {event.id}
              </td>
              <td>
                <span className="text-sm">
                  {(new Date(event.date)).toLocaleDateString('fr-FR', {
                    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </span>
              </td>
              <td>
                <strong className="font-semibold">{event.title}</strong>
                <br />
                {event.description}
              </td>
              <td><Badge>{event.costume}</Badge></td>
              <td><Link to={`/events/${event.id}/edit`}>Modifier</Link></td>
            </tr>
          ))}

        </tbody>
      </table>
    </div>
  );
}
