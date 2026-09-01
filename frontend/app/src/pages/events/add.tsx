import { useMutation } from '@tanstack/react-query';
import type { EventCreate } from 'bagad-client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/toast';
import Header from '../../components/header';
import Container from '../../components/container';
import { queryClient, useApiClient } from '../../config/client';
import EventForm from './components/form';

export default function AddEventPage() {
  const { eventsApi } = useApiClient();
  const navigate = useNavigate();
  const { mutateAsync } = useMutation({
    mutationFn: async (data: EventCreate) => await eventsApi.createEventApiV1EventsPost({ eventCreate: data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      void navigate('/events/manage');
    },
    onError: (error) => {
      toast.add({ title: `Erreur lors de la création de l'évènement : ${error.message}`, type: 'error' });
    },
  });
  const onSubmit = async (data: EventCreate) => await mutateAsync(data);

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
