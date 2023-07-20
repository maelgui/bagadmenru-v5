/* eslint-disable react/jsx-props-no-spreading */
import { useMutation, useQuery } from '@tanstack/react-query';
import { EventCreate } from 'bagad-client';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header';

import { eventsApi, queryClient } from '../../config/client';
import EventForm from './form';

export default function EditEventPage() {
  const { eventId } = useParams();
  if (!eventId) {
    return null;
  }

  const { data: event } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.getEventApiV1EventsEventIdGet({ eventId }),
  });

  const navigate = useNavigate();
  const { mutate } = useMutation({
    mutationFn: (data: EventCreate) => (
      eventsApi.updateEventApiV1EventsEventIdPut({ eventId, eventCreate: data })
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/events');
    },
  });
  const onSubmit = (data: EventCreate) => mutate(data);

  if (!event) {
    return <>Loading</>;
  }

  return (
    <>
      <Header
        title="Modifier un évènement"
        subtitle={`${event?.title} le ${event?.date}`}
      />
      <EventForm onSubmit={onSubmit} initialData={event} />
    </>
  );
}
