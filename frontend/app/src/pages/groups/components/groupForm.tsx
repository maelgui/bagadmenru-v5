import { useQuery } from '@tanstack/react-query';
import { GroupCreate } from 'bagad-client';
import { SubmitHandler, useForm } from 'react-hook-form';
import Button from '../../../components/button';
import Input from '../../../components/input';
import { useApiClient } from '../../../config/client';
import groupBy from '../../../utils/groupby';

interface PermissionsFormProps {
  onSubmit: SubmitHandler<GroupCreate>,
}
export default function PermissionsForm({ onSubmit }: PermissionsFormProps) {
  const { usersApi } = useApiClient();
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<GroupCreate>();

  const { data: permissionsPerTag } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => usersApi.listPermissionsApiV1PermissionsGet(),
    select: (d) => groupBy(d, (e) => e.tag),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="name">Nom</label>
        <Input
          type="text"
          id="name"
          error={errors.name?.message}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...register('name', { required: 'Ce champ est obligatoire.' })}
        />
      </div>
      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="color">Couleur</label>
        <Input
          type="color"
          id="color"
          error={errors.name?.message}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...register('color', { required: 'Ce champ est obligatoire.' })}
        />
      </div>

      <Button type="submit">Créer</Button>
    </form>

  );
}
