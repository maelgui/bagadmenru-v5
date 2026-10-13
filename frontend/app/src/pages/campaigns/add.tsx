import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/toast';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import CampaignForm, { type CampaignFormData } from './components/CampaignForm';

export default function AddCampaignPage() {
  const navigate = useNavigate();
  const { campaignsApi } = useApiClient();

  const { mutateAsync } = useMutation({
    mutationFn: async (data: CampaignFormData) => await campaignsApi.createCampaignApiV1CampaignsPost({
      campaignCreate: {
        name: data.name,
        description: data.description || null,
        groupId: data.groupId,
      },
    }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.add({ title: 'Campagne créée', type: 'success' });
      void navigate(`/campaigns/${created.id}`);
    },
    onError: (error: Error) => {
      toast.add({ title: `Erreur lors de la création de la campagne : ${error.message}`, type: 'error' });
    },
  });

  return (
    <>
      <Header
        title="Créer une campagne"
        subtitle="Regrouper des évènements sous un thème commun"
        breadcrumb={[
          { title: 'Campagnes', link: '/campaigns' },
          { title: 'Créer une campagne' },
        ]}
      />
      <Container>
        <CampaignForm onSubmit={async (data) => { await mutateAsync(data); }} />
      </Container>
    </>
  );
}
