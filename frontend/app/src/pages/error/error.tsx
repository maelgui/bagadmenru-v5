import { CircleAlertIcon } from 'lucide-react';
import { useRouteError } from 'react-router-dom';

import { Alert, AlertTitle } from '@/components/ui/alert';
import Container from '../../components/container';
import ErrorLayout from '../../layout/error';

export default function RoutingErrorComponent() {
  const error = useRouteError();

  console.error(error);

  return (
    <ErrorLayout>
      <Container>
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Une erreur est survenue</AlertTitle>
        </Alert>
      </Container>
    </ErrorLayout>
  );
}
