import { BellIcon, BellOffIcon } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import env from '../env';
import type { PushNotificationStatus } from '../utils/usePushNotifications';

interface PushNotificationFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  isLoading: boolean;
  status: PushNotificationStatus;
  isSupported: boolean;
  /** Whether the current value is a staged change, applied when the form is saved. */
  staged: boolean;
  /** Show the "send a test notification" link (only meaningful once registered). */
  showTest: boolean;
}

function describePushState(checked: boolean, staged: boolean): string {
  if (staged) {
    return checked
      ? 'Sera activé sur cet appareil après enregistrement.'
      : 'Sera désactivé sur cet appareil après enregistrement.';
  }
  return checked
    ? 'Vous recevrez des notifications pour les nouveaux événements sur cet appareil.'
    : 'Activez pour recevoir des notifications push sur cet appareil.';
}

export default function PushNotificationField({
  checked,
  onCheckedChange,
  isLoading,
  status,
  isSupported,
  staged,
  showTest,
}: PushNotificationFieldProps) {
  const apiUrl = env.VITE_BBE2_API_URL || '';

  if (!isSupported) {
    return (
      <Alert>
        <BellOffIcon aria-hidden="true" />
        <AlertDescription>
          Les notifications push ne sont pas supportées par votre navigateur.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'denied') {
    return (
      <Alert variant="destructive">
        <BellOffIcon aria-hidden="true" />
        <AlertDescription>
          Les notifications sont bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.
        </AlertDescription>
      </Alert>
    );
  }

  const handleTest = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/push/test`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        toast.add({ title: 'Notification de test envoyée !', type: 'success' });
      } else {
        toast.add({ title: 'Erreur lors de l\'envoi de la notification.', type: 'error' });
      }
    } catch {
      toast.add({ title: 'Erreur réseau.', type: 'error' });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Field orientation="horizontal" data-disabled={isLoading || undefined}>
        <Switch
          id="pushNotifications"
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={isLoading}
        />
        <FieldContent>
          <FieldLabel htmlFor="pushNotifications">
            {checked ? <BellIcon aria-hidden="true" /> : <BellOffIcon aria-hidden="true" />}
            Notifications push
          </FieldLabel>
          <FieldDescription>
            {describePushState(checked, staged)}
          </FieldDescription>
        </FieldContent>
        {isLoading ? <Spinner aria-label="Chargement" /> : null}
      </Field>
      {showTest ? (
        <div>
          <Button type="button" variant="link" size="sm" onClick={handleTest}>
            Envoyer une notification de test
          </Button>
        </div>
      ) : null}
    </div>
  );
}
