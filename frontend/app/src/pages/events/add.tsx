/* eslint-disable react/jsx-props-no-spreading */
import { useMutation } from '@tanstack/react-query';
import { EventCreate } from 'bagad-client';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header';

import { eventsApi, queryClient } from '../../config/client';
import EventForm from './form';

export default function AddEventPage() {
  const navigate = useNavigate();
  const { mutate } = useMutation({
    mutationFn: (data: EventCreate) => eventsApi.createEventApiV1EventsPost({ eventCreate: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/events');
    },
  });
  const onSubmit = (data: EventCreate) => mutate(data);

  return (
    <>
      <Header
        title="Ajouter un évènement"
        subtitle="Sortie/répétition/réunion..."
      />
      <EventForm onSubmit={onSubmit} />
    </>
  );
}
