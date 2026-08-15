import { useMutation, useQuery } from '@tanstack/react-query';
import type { Campaign } from 'bagad-client';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import CampaignForm, { type CampaignFormData } from './components/CampaignForm';

export default function EditCampaignPage() {
    const { id: idRaw } = useParams<'id'>();
    if (!idRaw) {
        throw new Error('Missing campaign id');
    }

    const campaignId = parseInt(idRaw, 10);
    const navigate = useNavigate();
    const { campaignsApi } = useApiClient();

    const { data: campaign } = useQuery<Campaign>({
        queryKey: ['campaigns', campaignId],
        queryFn: async () => await campaignsApi.getCampaignApiV1CampaignsCampaignIdGet({ campaignId }),
    });

    const { mutateAsync, isPending } = useMutation({
        mutationFn: async (data: CampaignFormData) => await campaignsApi.updateCampaignApiV1CampaignsCampaignIdPatch({
            campaignId,
            campaignUpdate: {
                name: data.name,
                description: data.description || null,
                groupId: data.group_id,
            },
        }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            toast.success('Campagne mise à jour');
            void navigate(`/campaigns/${campaignId}`);
        },
        onError: (error: Error) => {
            toast.error(`Erreur lors de la mise à jour de la campagne : ${error.message}`);
        },
    });

    const onSubmit = async (data: CampaignFormData) => {
        await mutateAsync(data);
    };

    const defaultValues: Partial<CampaignFormData> | undefined = campaign
        ? {
            name: campaign.name,
            description: campaign.description ?? undefined,
            group_id: campaign.groupId,
        }
        : undefined;

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
                {defaultValues ? (
                    <CampaignForm
                        onSubmit={onSubmit}
                        defaultValues={defaultValues}
                        isLoading={isPending}
                    />
                ) : (
                    <p className="text-gray-500">Chargement…</p>
                )}
            </Container>
        </>
    );
}
