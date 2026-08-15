import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Button from '../../../components/button';
import Input from '../../../components/input';
import Select from '../../../components/select';
import { useApiClient } from '../../../config/client';

const NAME_MAX_LENGTH = 150;

const campaignFormSchema = z.object({
    name: z
        .string()
        .min(1, 'Ce champ est obligatoire.')
        .max(NAME_MAX_LENGTH, 'Le nom ne doit pas dépasser 150 caractères.'),
    description: z.string().optional(),
    group_id: z.coerce.number().min(1, 'Ce champ est obligatoire.'),
});

export type CampaignFormData = z.infer<typeof campaignFormSchema>;

interface CampaignFormProps {
    onSubmit: (data: CampaignFormData) => void | Promise<void>;
    defaultValues?: Partial<CampaignFormData>;
    isLoading?: boolean;
}

export default function CampaignForm({
    onSubmit,
    defaultValues,
    isLoading = false,
}: CampaignFormProps) {
    const navigate = useNavigate();
    const { usersApi } = useApiClient();

    const { data: groups } = useQuery({
        queryKey: ['groups'],
        queryFn: async () => await usersApi.listGroupsApiV1GroupsGet(),
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CampaignFormData>({
        resolver: zodResolver(campaignFormSchema),
        defaultValues,
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6">
                <label className="mb-2 block font-semibold" htmlFor="name">
                    Nom
                </label>
                <Input
                    type="text"
                    id="name"
                    error={errors.name?.message}
                    {...register('name')}
                />
            </div>

            <div className="mb-6">
                <label className="mb-2 block font-semibold" htmlFor="description">
                    Description
                </label>
                <textarea
                    id="description"
                    rows={3}
                    className="block w-full border-gray-200 rounded py-2 px-4 border focus:outline-none focus:bg-white focus:border-pourpre-400 focus:ring-1 focus:ring-pourpre-400 hover:bg-gray-50"
                    {...register('description')}
                />
            </div>

            <div className="mb-6">
                <label className="mb-2 block font-semibold" htmlFor="group_id">
                    Groupe
                </label>
                <Select
                    id="group_id"
                    error={errors.group_id?.message}
                    {...register('group_id')}
                >
                    <option value="">Sélectionner un groupe</option>
                    {groups?.map((group) => (
                        <option key={group.id} value={group.id}>
                            {group.name}
                        </option>
                    ))}
                </Select>
            </div>

            <div className="flex gap-2">
                <Button type="submit" isLoading={isLoading}>
                    Enregistrer
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => { void navigate(-1); }}
                >
                    Annuler
                </Button>
            </div>
        </form>
    );
}
