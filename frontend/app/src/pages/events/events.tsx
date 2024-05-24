import {
  faChevronRight,
  faPlusCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Alert from '../../components/alert';
import Badge from '../../components/badge';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';
import EventCategories from '../../utils/event-category';

export default function EventsManagePage() {
  const { eventsApi } = useApiClient();

  const { data: events } = useQuery({ queryKey: ['events'], queryFn: () => eventsApi.listEventsApiV1EventsGet({ limit: 100, ordering: '-date' }) });

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
          { title: 'Évènements', link: '/events' },
          { title: 'Gestion des évènements' },
        ]}

      />
      <Container>
        {(events && events.length) ? (
          <div className="overflow-x-auto">
            <ul className="divide-y">
              {events.map((event) => (
                <li key={event.id} className="gap-4 flex items-center hover:bg-gray-50 relative px-8 py-4">
                  <div>
                    <Link to={`/events/edit/${event.id}`}>
                      <span className="absolute top-0 bottom-0 left-0 right-0" />
                      <span className="block whitespace-nowrap">
                        {event.title}
                        <Badge className="mx-4 align-middle" color={EventCategories[event.category]?.bg ?? 'bg-gray-500'}>{EventCategories[event.category]?.name ?? event.category}</Badge>
                      </span>
                      <span className="text-sm text-gray-500">{event.description}</span>
                    </Link>
                  </div>
                  <div className="ml-auto">
                    {event.date.toLocaleDateString(undefined, { dateStyle: 'full' })}
                  </div>
                  <div className=" p-8">
                    <FontAwesomeIcon icon={faChevronRight} className="text-gray-500" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : <Alert type="warning">Aucun évènement</Alert>}
      </Container>
    </>
  );
}
