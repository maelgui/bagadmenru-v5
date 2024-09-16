/* eslint-disable react/jsx-props-no-spreading */
import { useMutation } from '@tanstack/react-query';
import { MyProfileUpdate, Profile } from 'bagad-client';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import Button from '../../../components/button';
import { queryClient, useApiClient } from '../../../config/client';
import BaseProfileFormFields from './base';

export default function EditProfileForm({ profile = undefined }: { profile?: Profile }) {
  const { usersApi } = useApiClient();

  const methods = useForm<MyProfileUpdate>({ defaultValues: profile });

  const { mutate } = useMutation({
    mutationFn: (data: MyProfileUpdate) => usersApi.updateMyProfileApiV1ProfilesMePut({
      myProfileUpdate: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] });
      toast.success('Profile modifié avec succès !');
    },
  });
  const onSubmit = (data: MyProfileUpdate) => mutate(data);

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      <FormProvider {...methods}>
        <BaseProfileFormFields profile={profile} />
      </FormProvider>
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}
