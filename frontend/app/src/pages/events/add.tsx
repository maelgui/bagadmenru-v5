import { useMutation } from '@tanstack/react-query';
import type { EventCreate } from 'bagad-client';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/header';

import Container from '../../components/container';
import { queryClient, useApiClient } from '../../config/client';
import EventForm from './components/form';

export default function AddEventPage() {
  const { eventsApi } = useApiClient();

  const [searchParams] = useSearchParams();
  const campaignParam = searchParams.get('campaign');
  const parsedCampaignId = campaignParam ? parseInt(campaignParam, 10) : Number.NaN;
  const defaultCampaignId = Number.isNaN(parsedCampaignId) ? null : parsedCampaignId;

  const navigate = useNavigate();
  const { mutateAsync } = useMutation({
    mutationFn: async (data: EventCreate) => await eventsApi.createEventApiV1EventsPost({ eventCreate: data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      void navigate('/events/manage');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la création de l'évènement : ${error.message}`);
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
        <EventForm onSubmit={onSubmit} defaultCampaignId={defaultCampaignId} />
      </Container>
    </>
  );
}
