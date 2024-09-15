import { useQuery } from '@tanstack/react-query';
import {
  GroupCreate,
  Permission,
} from 'bagad-client';
import {
  Controller,
  SubmitHandler, useForm,
} from 'react-hook-form';
import Select, { FormatOptionLabelMeta } from 'react-select';
import Badge from '../../../components/badge';
import Button from '../../../components/button';
import Input from '../../../components/input';
import { useApiClient } from '../../../config/client';
import groupBy from '../../../utils/groupby';

function formatOptionLabel(data: Permission, { context }: FormatOptionLabelMeta<Permission>) {
  if (context === 'value') {
    return data.id;
  }
  return (
    <div>
      <div>{data.id}</div>
      <div className="text-sm text-gray-500">{data.description}</div>
    </div>
  );
}

interface PermissionsFormProps {
  onSubmit: SubmitHandler<GroupCreate>,
  data?: GroupCreate,
}

export default function PermissionsForm({
  onSubmit,
  data = undefined,
}: PermissionsFormProps) {
  const { usersApi } = useApiClient();
  const {
    register, handleSubmit, formState: { errors }, control, watch,
  } = useForm<GroupCreate>({ defaultValues: data || { color: '#932a58', permissionIds: [] } });

  const watchName = watch('name', 'groupe');
  const watchColor = watch('color', '');

  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => usersApi.listPermissionsApiV1PermissionsGet(),
  });
  const permissionsPerTag = Array.from(groupBy(permissions ?? [], (e) => e.tag).entries()).map(
    ([tag, perms]) => ({ label: tag, options: perms }),
  );

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
        <label htmlFor="color">
          <span className="mb-2 block font-semibold">Couleur</span>
          <input
            type="color"
            id="color"
            className="hidden"
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...register('color', { required: 'Ce champ est obligatoire.' })}
          />
          {!watchName ? (
            <p className="text-gray-500 text-sm">Choisissez d&apos;abord un nom de groupe.</p>
          ) : (
            <Badge style={{ backgroundColor: watchColor }} className="cursor-pointer">{watchName}</Badge>
          )}

        </label>
      </div>

      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="permissionIds">Permissions</label>
        <Controller
          name="permissionIds"
          control={control}
          render={({ field: { onChange, value, ref } }) => (
            <Select
              isMulti
              ref={ref}
              options={permissionsPerTag}
              getOptionValue={(option) => option.id}
              formatOptionLabel={formatOptionLabel}
              value={permissions?.filter((c) => value.includes(c.id))}
              onChange={(val) => onChange(val.map((c) => c.id))}
              className="basic-multi-select"
              classNamePrefix="select"
            />

          )}
        />
      </div>

      <Button type="submit">Créer</Button>
    </form>

  );
}
