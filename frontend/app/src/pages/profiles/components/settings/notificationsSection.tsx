import { useMutation } from '@tanstack/react-query';
import type { Profile } from 'bagad-client';
import { MailIcon, MailXIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import PushNotificationField from '../../../../components/PushNotificationField';
import { queryClient, useApiClient } from '../../../../config/client';
import { usePushNotifications } from '../../../../utils/usePushNotifications';

/**
 * "Notifications" section: email preference and per-device push notifications.
 * Each control saves immediately and independently.
 */
export default function NotificationsSection({ profile }: { profile: Profile }) {
  const { usersApi } = useApiClient();
  const push = usePushNotifications();

  const { mutate: setReceivesEmails, isPending: isEmailPending } = useMutation({
    mutationFn: async (receivesEmails: boolean) => await usersApi.updateMyProfileApiV1ProfilesMePut({
      myProfileUpdate: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        pictureKey: profile.pictureKey,
        receivesEmails,
      },
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] });
      toast.add({ title: 'Préférence enregistrée.', type: 'success' });
    },
    onError: () => {
      toast.add({ title: 'Une erreur est survenue.', type: 'error' });
    },
  });

  const handlePushChange = async (checked: boolean) => {
    try {
      if (checked) {
        const prepared = await push.prepare();
        if (prepared) {
          await push.enable();
          toast.add({ title: 'Notifications push activées.', type: 'success' });
        }
      } else {
        await push.disable();
        toast.add({ title: 'Notifications push désactivées.', type: 'success' });
      }
    } catch {
      toast.add({
        title: 'Erreur lors de la mise à jour des notifications push.',
        type: 'error',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choisissez comment vous souhaitez être informé.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Field orientation="horizontal" data-disabled={isEmailPending || undefined}>
          <Switch
            id="receivesEmails"
            checked={profile.receivesEmails}
            disabled={isEmailPending}
            onCheckedChange={(checked) => setReceivesEmails(checked)}
          />
          <FieldContent>
            <FieldLabel htmlFor="receivesEmails">
              {profile.receivesEmails ? <MailIcon aria-hidden="true" /> : <MailXIcon aria-hidden="true" />}
              Notifications par email
            </FieldLabel>
            <FieldDescription>
              Recevoir les emails du groupe (événements, annonces...).
            </FieldDescription>
          </FieldContent>
        </Field>

        <Separator />

        <PushNotificationField
          checked={push.isSubscribed}
          onCheckedChange={(checked) => { void handlePushChange(checked); }}
          isLoading={push.isLoading}
          status={push.status}
          isSupported={push.isSupported}
          staged={false}
          showTest={push.isSubscribed}
        />
      </CardContent>
    </Card>
  );
}
