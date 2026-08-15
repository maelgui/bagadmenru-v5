import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import CampaignForm, { type CampaignFormData } from './components/CampaignForm';

export default function AddCampaignPage() {
    const navigate = useNavigate();
    const { campaignsApi } = useApiClient();

    const { mutateAsync, isPending } = useMutation({
        mutationFn: async (data: CampaignFormData) => await campaignsApi.createCampaignApiV1CampaignsPost({
            campaignCreate: {
                name: data.name,
                description: data.description || null,
                groupId: data.group_id,
            },
        }),
        onSuccess: async (created) => {
            await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            toast.success('Campagne créée');
            void navigate(`/campaigns/${created.id}`);
        },
        onError: (error: Error) => {
            toast.error(`Erreur lors de la création de la campagne : ${error.message}`);
        },
    });

    const onSubmit = async (data: CampaignFormData) => {
        await mutateAsync(data);
    };

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
                <CampaignForm onSubmit={onSubmit} isLoading={isPending} />
            </Container>
        </>
    );
}
