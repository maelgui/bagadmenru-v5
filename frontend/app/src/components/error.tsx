import { CircleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Error({ error }: { error?: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>Erreur :</AlertTitle>
      {error ? <AlertDescription>{error}</AlertDescription> : null}
    </Alert>
  );
}
