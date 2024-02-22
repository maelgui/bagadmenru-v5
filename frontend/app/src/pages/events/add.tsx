import { useMutation } from '@tanstack/react-query';
import { EventCreate } from 'bagad-client';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header';

import Container from '../../components/container';
import { queryClient, useApiClient } from '../../config/client';
import EventForm from './components/form';

export default function AddEventPage() {
  const { eventsApi } = useApiClient();

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
          { link: '/events/doodle', title: 'Évènements' },
          { link: '/events/manage', title: 'Gestion des évènements' },
          { title: 'Ajouter un évènement' },
        ]}
      />
      <Container>
        <EventForm onSubmit={onSubmit} />
      </Container>
    </>
  );
}
