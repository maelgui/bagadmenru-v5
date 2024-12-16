import { faSquare, faSquareCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import {
  GroupCreate,
  Role,
} from 'bagad-client';
import { useEffect } from 'react';
import {
  Controller,
  SubmitHandler, useForm,
} from 'react-hook-form';
import Select, { FormatOptionLabelMeta } from 'react-select';
import Badge from '../../../components/badge';
import Button from '../../../components/button';
import Input from '../../../components/input';
import { useApiClient } from '../../../config/client';

function formatOptionLabel(data: Role, { context }: FormatOptionLabelMeta<Role>) {
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
    register, handleSubmit, setValue, formState: { errors }, control, watch,
  } = useForm<GroupCreate & { mailingListEnabled: boolean }>(
    { defaultValues: { mailingListEnabled: !!(data?.mailingList), ...(data || { color: '#932a58', roleIds: [] }) } },
  );

  const watchName = watch('name', 'groupe');
  const watchColor = watch('color', '');
  const watchMailingListEnabled = watch('mailingListEnabled');

  useEffect(() => {
    if (watchMailingListEnabled === false) {
      setValue('mailingList', null);
    }
  }, [watchMailingListEnabled]);

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.listRolesApiV1RolesGet(),
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
        <label className="mb-2 block font-semibold" htmlFor="roleIds">Permissions</label>
        <Controller
          name="roleIds"
          control={control}
          render={({ field: { onChange, value, ref } }) => (
            <Select
              isMulti
              ref={ref}
              options={roles}
              getOptionValue={(option) => option.id}
              formatOptionLabel={formatOptionLabel}
              value={roles?.filter((c) => value.includes(c.id))}
              onChange={(val) => onChange(val.map((c) => c.id))}
              className="basic-multi-select"
              classNamePrefix="select"
            />

          )}
        />
      </div>

      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="mailingList">Mailing liste</label>
        <div className="relative mb-2">
          <input
            type="checkbox"
            id="mailingListEnabled"
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...register('mailingListEnabled')}
            className="hidden peer"
          />

          <label htmlFor="mailingListEnabled" className="block p-4 pl-16 cursor-pointer rounded border-2 ring-2 ring-transparent ring-offset-2 peer-checked:border-pourpre-500 hover:bg-gray-50 active:ring-pourpre-200 focus:ring-pourpre-200 focus:ring-offset-0">
            <span className="mb-2 block font-semibold">Associer une mailing liste</span>
            <p className="text-gray-600">
              Les utilisateurs de ce groupe seront tous ajoutés à une mailing list
            </p>
          </label>
          <FontAwesomeIcon className="absolute invisible top-4 left-4 md:top-8 md:left-8 peer-checked:visible text-pourpre-500" icon={faSquareCheck} />
          <FontAwesomeIcon className="absolute visible top-4 left-4 md:top-8 md:left-8 peer-checked:invisible text-gray-200" icon={faSquare} />
        </div>
        {watchMailingListEnabled ? (
          <div className="relative">
            <Input
              type="text"
              id="mailingList"
              className="flex-1 grow"
              error={errors.mailingList?.message}
              // eslint-disable-next-line react/jsx-props-no-spreading
              {...register('mailingList', { required: 'Ce champ est obligatoire.' })}
            />
            <span className="absolute top-0 bottom-0 right-0 grid place-content-center">
              <span className="px-4">
                @bagadmenru.bzh
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <Button type="submit">Enregistrer</Button>
    </form>

  );
}
