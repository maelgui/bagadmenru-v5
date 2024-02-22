import { faGear, faPlusCircle, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Event } from 'bagad-client';
import { Link } from 'react-router-dom';
import Alert from '../../components/alert';
import Badge from '../../components/badge';
import Button from '../../components/button';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import EventCategories from '../../utils/event-category';

export default function EventsManagePage() {
  const { eventsApi } = useApiClient();

  const { data: events } = useQuery({ queryKey: ['events'], queryFn: () => eventsApi.listEventsApiV1EventsGet() });

  const { mutate } = useMutation({
    mutationFn: (data: Event) => eventsApi.deleteEventApiV1EventsEventIdDelete({
      eventId: data.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  return (
    <>
      <Header
        title="Gestion des évènements"
        subtitle="Ajouter, modifier, supprimer..."
        actions={[
          <Header.Action key="add-event" as={Link} to="/events/add">
            <FontAwesomeIcon icon={faPlusCircle} />
            {' '}
            Ajouter
          </Header.Action>,
        ]}
        breadcrumb={[
          { title: 'Évènements', link: '/events/doodle' },
          { title: 'Gestion des évènements' },
        ]}

      />
      <Container>
        {(events && events.length) ? (
          <div className="overflow-x-auto">
            <table className="table-auto w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-5">Nom</th>
                  <th>Date</th>
                  <th>Catégorie</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map((event) => (
                  <tr key={event.id} className="my-4 py-4">
                    <td className="p-4">
                      {event.title}
                      <br />
                      <span className="text-sm text-gray-500">{event.description}</span>
                    </td>
                    <td>{event.date.toLocaleDateString(undefined, { dateStyle: 'full' })}</td>
                    <td><Badge color={EventCategories[event.category]?.bg ?? 'bg-gray-500'}>{EventCategories[event.category]?.name ?? event.category}</Badge></td>
                    <td className="text-right">
                      <Button as={Link} to={`/events/edit/${event.id}`} size="sm">
                        <FontAwesomeIcon icon={faGear} />
                        {' '}
                        Modifier
                      </Button>
                      <Button
                        onClick={() => {
                          // eslint-disable-next-line no-alert
                          const sure = window.confirm(`Supprimer la sortie ${event.title} ?`);
                          if (sure) {
                            mutate(event);
                          }
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                        {' '}
                        Supprimer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Alert type="warning">Aucun évènement</Alert>}
      </Container>
    </>
  );
}
