import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { EventCreate } from 'bagad-client';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/button';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import EventForm from './components/form';

export default function EditEventPage() {
  const { eventsApi } = useApiClient();
  const { eventId } = useParams<"eventId">();
  if (!eventId) throw new Error("No event id");
  const parsedEventId = parseInt(eventId, 10);

  const { data } = useQuery({
    queryKey: ['events', eventId],
    queryFn: async () => await eventsApi.getEventApiV1EventsEventIdGet({ eventId: parsedEventId }),
  });

  const navigate = useNavigate();
  const { mutate } = useMutation({
    mutationFn: async (d: EventCreate) => await eventsApi.updateEventApiV1EventsEventIdPut({
      eventId: parsedEventId,
      eventCreate: d,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      void navigate('/events/manage');
    },
  });
  const onSubmit = (d: EventCreate) => mutate(d);

  const { mutate: deleteMutation } = useMutation({
    mutationFn: async (eid: number) => await eventsApi.deleteEventApiV1EventsEventIdDelete({
      eventId: eid,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'], refetchType: 'none' });
      void navigate('/events/manage');
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

              const sure = window.confirm(`Supprimer la sortie ${data?.title} ?`);
              if (sure) {
                deleteMutation(parsedEventId);
              }
            }}
            size="sm"
            variant="outline"
            icon={faTrash}
          >
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
