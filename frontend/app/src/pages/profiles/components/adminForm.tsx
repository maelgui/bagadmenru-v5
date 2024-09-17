/* eslint-disable react/jsx-props-no-spreading */
import { useQuery } from '@tanstack/react-query';
import { Profile, ProfileCreate, ProfileUpdate } from 'bagad-client';
import {
  Controller, FormProvider, SubmitHandler, useForm,
} from 'react-hook-form';
import Select from 'react-select';
import Button from '../../../components/button';
import Input from '../../../components/input';
import { useApiClient } from '../../../config/client';
import BaseProfileFormFields from './base';

interface ProfileFormData extends ProfileUpdate, ProfileCreate { }

interface AdminProfileForm {
  profile?: Profile
  onSubmit: SubmitHandler<ProfileFormData>
}

export default function AdminEditProfileForm(
  { profile = undefined, onSubmit }: AdminProfileForm,
) {
  const { usersApi } = useApiClient();

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => usersApi.listGroupsApiV1GroupsGet(),
  });

  const methods = useForm<ProfileFormData>({
    defaultValues: profile ? {
      firstName: profile.firstName,
      lastName: profile.lastName,
      groupIds: profile.groups.map((g) => g.id),
      instrumentId: profile.instrument?.id,
    } : {},
  });

  const {
    handleSubmit, control, register, formState: { errors, isSubmitting },
  } = methods;

  console.log(isSubmitting);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormProvider {...methods}>
        <BaseProfileFormFields profile={profile} avatar={false} />
      </FormProvider>
      {!profile ? (
        <div className="mb-6">
          <label className="mb-2 block font-semibold" htmlFor="email">E-mail</label>
          <Input
            type="email"
            id="email"
            error={errors.email?.message}
            {...register('email', { required: 'Ce champ est obligatoire.' })}
          />
        </div>
      ) : null}

      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="instrumentId">Instrument</label>
        <Controller
          name="instrumentId"
          control={control}
          render={({ field: { onChange, value, ref } }) => (
            <Select
              ref={ref}
              inputId="instrumentId"
              options={groups}
              getOptionValue={(option) => option.id.toString()}
              getOptionLabel={(option) => option.name}
              value={groups?.find((c) => c.id === value)}
              onChange={(val) => onChange(val?.id)}
            />

          )}
        />
      </div>
      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="groupIds">Groupes</label>
        <Controller
          name="groupIds"
          control={control}
          defaultValue={[]}
          render={({ field: { onChange, value, ref } }) => (
            <Select
              isMulti
              inputId="groupIds"
              ref={ref}
              options={groups}
              getOptionValue={(option) => option.id.toString()}
              getOptionLabel={(option) => option.name}
              value={groups?.filter((c) => value?.includes(c.id))}
              onChange={(val) => onChange(val.map((c) => c.id))}
            />

          )}
        />
      </div>
      <Button type="submit" isLoading={isSubmitting}>Enregistrer</Button>
    </form>
  );
}
