import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import { EventCreate } from 'bagad-client';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/button';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import EventForm from './components/form';

type EditEventParams = {
  eventId: string;
};

export default function EditEventPage() {
  const { eventsApi } = useApiClient();
  const params = useParams<EditEventParams>();

  const eventId = parseInt(params.eventId!, 10);

  const { data } = useQuery({
    queryKey: ['events', params.eventId],
    queryFn: () => eventsApi.getEventApiV1EventsEventIdGet({ eventId }),
    enabled: !!params.eventId,
  });

  const navigate = useNavigate();
  const { mutate } = useMutation({
    mutationFn: (d: EventCreate) => eventsApi.updateEventApiV1EventsEventIdPut({
      eventId,
      eventCreate: d,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/events/manage');
    },
  });
  const onSubmit = (d: EventCreate) => mutate(d);

  const { mutate: deleteMutation } = useMutation({
    mutationFn: (eid: number) => eventsApi.deleteEventApiV1EventsEventIdDelete({
      eventId: eid,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'], refetchType: 'none' });
      navigate('/events/manage');
    },
  });

  return (
    <>
      <Header
        title="Modifier un évènement"
        subtitle="Sortie/répétition/réunion..."
        breadcrumb={[
          { link: '/events', title: 'Évènements' },
          { link: '/events/manage', title: 'Gestion des évènements' },
          { title: 'Modifier un évènement' },
        ]}
        actions={[
          <Header.Action
            key="event.delete"
            as={Button}
            onClick={() => {
              // eslint-disable-next-line no-alert
              const sure = window.confirm(`Supprimer la sortie ${data?.title} ?`);
              if (sure) {
                deleteMutation(eventId);
              }
            }}
            size="sm"
            variant="outline"
          >
            <FontAwesomeIcon icon={faTrash} />
            {' '}
            Supprimer
          </Header.Action>,

        ]}
      />
      <Container>
        {data
          ? <EventForm onSubmit={onSubmit} data={data} /> : 'Chargement'}
      </Container>
    </>
  );
}
