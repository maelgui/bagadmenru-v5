/* eslint-disable react/jsx-props-no-spreading */
import { useMutation, useQuery } from '@tanstack/react-query';
import { EventCreate } from 'bagad-client';
import { useNavigate, useParams } from 'react-router-dom';
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

  return (
    <>
      <Header
        title="Modifier un évènement"
        subtitle="Sortie/répétition/réunion..."
        breadcrumb={[
          { link: '/events', title: 'Calendrier' },
          { link: '/events/manage', title: 'Gérer' },
          { title: 'Modifier un évènement' },
        ]}
      />
      <Container>
        {data
          ? <EventForm onSubmit={onSubmit} data={data} /> : 'Chargement'}
      </Container>
    </>
  );
}
