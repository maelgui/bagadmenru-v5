import type {
  MyProfileUpdate, Profile,
} from 'bagad-client';
import { useState } from 'react';
import { FormProvider, type SubmitHandler, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import PushNotificationField from '../../../components/PushNotificationField';
import { usePushNotifications } from '../../../utils/usePushNotifications';
import BaseProfileFormFields from './baseForm';

interface ProfileFormProps {
  profile: Profile
  onSubmit: SubmitHandler<MyProfileUpdate>
}

export default function EditProfileForm({ profile, onSubmit }: ProfileFormProps) {
  const push = usePushNotifications();
  // null = untouched: the switch mirrors the current browser subscription.
  const [pushDesired, setPushDesired] = useState<boolean | null>(null);
  const pushChecked = pushDesired ?? push.isSubscribed;

  const methods = useForm<MyProfileUpdate>({
    defaultValues: {
      pictureKey: profile.pictureKey,
      firstName: profile.firstName,
      lastName: profile.lastName,
      receivesEmails: profile.receivesEmails,
    },
  });

  const handlePushChange = async (checked: boolean) => {
    if (checked) {
      // Prepare locally (permission prompt + browser subscription).
      // The backend is only registered when the form is saved.
      const prepared = await push.prepare();
      setPushDesired(prepared ? true : null);
    } else {
      setPushDesired(false);
    }
  };

  const submit: SubmitHandler<MyProfileUpdate> = async (data) => {
    // Apply the staged push preference alongside the profile save.
    if (pushDesired !== null) {
      try {
        if (pushDesired) {
          await push.enable();
        } else {
          await push.disable();
        }
        setPushDesired(null);
      } catch {
        toast.add({
          title: 'Erreur lors de la mise à jour des notifications push.',
          type: 'error',
        });
      }
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={methods.handleSubmit(submit)}>
      <FormProvider {...methods}>
        <BaseProfileFormFields profile={profile} />
      </FormProvider>
      <div className="mb-6">
        <PushNotificationField
          checked={pushChecked}
          onCheckedChange={(checked) => { void handlePushChange(checked); }}
          isLoading={push.isLoading}
          status={push.status}
          isSupported={push.isSupported}
          staged={pushDesired !== null}
          showTest={pushDesired === null && push.isSubscribed}
        />
      </div>
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}
