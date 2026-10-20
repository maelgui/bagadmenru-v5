import { useMutation, useQuery } from '@tanstack/react-query';
import type { Campaign } from 'bagad-client';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/components/ui/toast';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import CampaignForm, { type CampaignFormData } from './components/CampaignForm';

export default function EditCampaignPage() {
  const { id } = useParams<'id'>();
  if (!id) throw new Error('Missing campaign id');
  const campaignId = Number(id);

  const navigate = useNavigate();
  const { campaignsApi } = useApiClient();

  const { data: campaign } = useQuery<Campaign>({
    queryKey: ['campaigns', campaignId],
    queryFn: async () => await campaignsApi.getCampaignApiV1CampaignsCampaignIdGet({ campaignId }),
  });

  const { mutateAsync } = useMutation({
    mutationFn: async (data: CampaignFormData) => await campaignsApi.updateCampaignApiV1CampaignsCampaignIdPatch({
      campaignId,
      campaignUpdate: {
        name: data.name,
        description: data.description || null,
        groupId: data.groupId,
      },
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.add({ title: 'Campagne mise à jour', type: 'success' });
      void navigate(`/campaigns/${campaignId}`);
    },
    onError: (error: Error) => {
      toast.add({ title: `Erreur lors de la mise à jour de la campagne : ${error.message}`, type: 'error' });
    },
  });

  return (
    <>
      <Header
        title="Modifier la campagne"
        subtitle={campaign?.name ?? ''}
        breadcrumb={[
          { title: 'Campagnes', link: '/campaigns' },
          { title: campaign?.name ?? '...', link: `/campaigns/${campaignId}` },
          { title: 'Modifier' },
        ]}
      />
      <Container>
        {campaign ? (
          <CampaignForm
            onSubmit={async (data) => { await mutateAsync(data); }}
            defaultValues={{
              name: campaign.name,
              description: campaign.description ?? '',
              groupId: campaign.groupId,
            }}
          />
        ) : (
          <p className="text-muted-foreground">Chargement…</p>
        )}
      </Container>
    </>
  );
}
