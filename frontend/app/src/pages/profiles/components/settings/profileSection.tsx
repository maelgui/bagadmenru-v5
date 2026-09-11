import { useMutation } from '@tanstack/react-query';
import type { MyProfileUpdate, Profile } from 'bagad-client';
import { FormProvider, type SubmitHandler, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { queryClient, useApiClient } from '../../../../config/client';
import BaseProfileFormFields from '../baseForm';

const messages = {
  loading: 'Enregistrement...',
  success: 'Profil mis à jour !',
  error: 'Une erreur est survenue.',
};

/**
 * "Profil" section: first name, last name and avatar. Saves independently
 * through PUT /profiles/me while preserving the current email preference.
 */
export default function ProfileSection({ profile }: { profile: Profile }) {
  const { usersApi } = useApiClient();

  const methods = useForm<MyProfileUpdate>({
    defaultValues: {
      pictureKey: profile.pictureKey,
      firstName: profile.firstName,
      lastName: profile.lastName,
      // Preserve the existing preferences; this section does not edit them.
      receivesEmails: profile.receivesEmails,
      receivesPush: profile.receivesPush,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: MyProfileUpdate) => await toast.promise(
      usersApi.updateMyProfileApiV1ProfilesMePut({ myProfileUpdate: data }),
      messages,
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] });
    },
  });

  const onSubmit: SubmitHandler<MyProfileUpdate> = (data) => mutate({
    ...data,
    // Keep the notification preferences untouched by this section.
    receivesEmails: profile.receivesEmails,
    receivesPush: profile.receivesPush,
  });

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>
            Votre nom et votre photo, visibles par les autres membres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...methods}>
            <BaseProfileFormFields profile={profile} showEmailToggle={false} />
          </FormProvider>
        </CardContent>
        <CardFooter className="border-t">
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            Enregistrer
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
