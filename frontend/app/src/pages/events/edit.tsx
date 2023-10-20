/* eslint-disable react/jsx-props-no-spreading */
import { useMutation, useQuery } from '@tanstack/react-query';
import { EventCreate } from 'bagad-client';
import { useNavigate, useParams } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import EventForm from './components/form';

export default function EditEventPage() {
  const { eventsApi } = useApiClient();
  const params = useParams();

  const { data } = useQuery({
    queryKey: ["events", params.eventId],
    queryFn: () => eventsApi.getEventApiV1EventsEventIdGet({ eventId: params.eventId! }),
    enabled: !!params.eventId,
  })


  const navigate = useNavigate();
  const { mutate } = useMutation({
    mutationFn: (data: EventCreate) => eventsApi.createEventApiV1EventsPost({ eventCreate: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/events/manage');
    },
  });
  const onSubmit = (data: EventCreate) => mutate(data);

  return (
    <>
      <Header
        title="Ajouter un évènement"
        subtitle="Sortie/répétition/réunion..."
        breadcrumb={[
          { link: '/events', title: 'Calendrier' },
          { title: 'Ajouter un évènement' },
        ]}
      />
      <Container>
        {data ?
          <EventForm onSubmit={onSubmit} data={data} /> : 'Chargement'}
      </Container>
    </>
  );
}
