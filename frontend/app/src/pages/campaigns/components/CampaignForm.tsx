import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useApiClient } from '../../../config/client';

export interface CampaignFormData {
  name: string;
  description: string;
  groupId: number;
}

interface CampaignFormProps {
  onSubmit: (data: CampaignFormData) => void | Promise<void>;
  defaultValues?: Partial<CampaignFormData>;
}

export default function CampaignForm({ onSubmit, defaultValues }: CampaignFormProps) {
  const navigate = useNavigate();
  const { usersApi } = useApiClient();

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => await usersApi.listGroupsApiV1GroupsGet(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormData>({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Nom</FieldLabel>
          <Input
            id="name"
            type="text"
            aria-invalid={!!errors.name}
            {...register('name', {
              required: 'Ce champ est obligatoire.',
              maxLength: { value: 150, message: 'Le nom ne doit pas dépasser 150 caractères.' },
            })}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" rows={3} {...register('description')} />
        </Field>

        <Field data-invalid={!!errors.groupId}>
          <FieldLabel htmlFor="groupId">Groupe</FieldLabel>
          <NativeSelect
            id="groupId"
            className="w-full"
            aria-invalid={!!errors.groupId}
            {...register('groupId', {
              required: 'Ce champ est obligatoire.',
              valueAsNumber: true,
            })}
          >
            <NativeSelectOption value="">Sélectionner un groupe</NativeSelectOption>
            {groups?.map((group) => (
              <NativeSelectOption key={group.id} value={group.id}>
                {group.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError>{errors.groupId?.message}</FieldError>
        </Field>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            Enregistrer
          </Button>
          <Button type="button" variant="outline" onClick={() => { void navigate(-1); }}>
            Annuler
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
