import { useMutation } from '@tanstack/react-query';
import type { Profile } from 'bagad-client';
import { BellIcon, BellOffIcon, MailIcon, MailXIcon } from 'lucide-react';
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
import { queryClient, useApiClient } from '../../../../config/client';
import PushDevicesList from './pushDevicesList';

/**
 * "Notifications" section: email and push preferences.
 *
 * Push has two independent layers: a per-user master switch (`receivesPush`,
 * mirrors `receivesEmails`) that suppresses delivery to every device when off,
 * and the per-device list below it (the source of truth for which devices are
 * subscribed). Both mutations send the full profile so neither preference
 * clobbers the other.
 */
export default function NotificationsSection({ profile }: { profile: Profile }) {
  const { usersApi } = useApiClient();

  const savePreference = async (
    overrides: { receivesEmails?: boolean; receivesPush?: boolean },
  ) => await usersApi.updateMyProfileApiV1ProfilesMePut({
    myProfileUpdate: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      pictureKey: profile.pictureKey,
      receivesEmails: overrides.receivesEmails ?? profile.receivesEmails,
      receivesPush: overrides.receivesPush ?? profile.receivesPush,
    },
  });

  const onSaved = async () => {
    await queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] });
    toast.add({ title: 'Préférence enregistrée.', type: 'success' });
  };
  const onSaveError = () => {
    toast.add({ title: 'Une erreur est survenue.', type: 'error' });
  };

  const { mutate: setReceivesEmails, isPending: isEmailPending } = useMutation({
    mutationFn: async (receivesEmails: boolean) => await savePreference({ receivesEmails }),
    onSuccess: onSaved,
    onError: onSaveError,
  });

  const { mutate: setReceivesPush, isPending: isPushPending } = useMutation({
    mutationFn: async (receivesPush: boolean) => await savePreference({ receivesPush }),
    onSuccess: onSaved,
    onError: onSaveError,
  });

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

        <Field orientation="horizontal" data-disabled={isPushPending || undefined}>
          <Switch
            id="receivesPush"
            checked={profile.receivesPush}
            disabled={isPushPending}
            onCheckedChange={(checked) => setReceivesPush(checked)}
          />
          <FieldContent>
            <FieldLabel htmlFor="receivesPush">
              {profile.receivesPush ? <BellIcon aria-hidden="true" /> : <BellOffIcon aria-hidden="true" />}
              Notifications push
            </FieldLabel>
            <FieldDescription>
              Recevoir les notifications push (nouveaux événements...). Désactivé,
              aucun de vos appareils ne recevra de notification.
            </FieldDescription>
          </FieldContent>
        </Field>

        <PushDevicesList pushEnabled={profile.receivesPush} />
      </CardContent>
    </Card>
  );
}
