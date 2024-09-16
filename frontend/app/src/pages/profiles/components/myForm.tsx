/* eslint-disable react/jsx-props-no-spreading */
import {
  MyProfileUpdate, Profile,
} from 'bagad-client';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import Button from '../../../components/button';
import BaseProfileFormFields from './base';

interface ProfileFormProps {
  profile: Profile
  onSubmit: SubmitHandler<MyProfileUpdate>
}

export default function EditProfileForm({ profile, onSubmit }: ProfileFormProps) {
  const methods = useForm<MyProfileUpdate>({
    defaultValues: {
      pictureKey: profile.pictureKey,
      firstName: profile.firstName,
      lastName: profile.lastName,
    },
  });

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      <FormProvider {...methods}>
        <BaseProfileFormFields profile={profile} />
      </FormProvider>
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}
