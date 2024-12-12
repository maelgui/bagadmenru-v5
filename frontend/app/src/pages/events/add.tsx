import { useMutation } from '@tanstack/react-query';
import { EventCreate } from 'bagad-client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header';

import Container from '../../components/container';
import { queryClient, useApiClient } from '../../config/client';
import EventForm from './components/form';

export default function AddEventPage() {
  const { eventsApi } = useApiClient();

  const navigate = useNavigate();
  const { mutateAsync } = useMutation({
    mutationFn: (data: EventCreate) => eventsApi.createEventApiV1EventsPost({ eventCreate: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/events/manage');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la création de l'évènement : ${error.message}`);
    },
  });
  const onSubmit = (data: EventCreate) => mutateAsync(data);

  return (
    <>
      <Header
        title="Ajouter un évènement"
        subtitle="Sortie/répétition/réunion..."
        breadcrumb={[
          { link: '/events', title: 'Évènements' },
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
