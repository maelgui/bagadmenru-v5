import { useRouteError } from 'react-router-dom';
import Container from '../../components/container';
import ErrorLayout from '../../layout/error';

export default function RoutingErrorComponent() {
  const error = useRouteError();
  /* eslint-disable no-console */
  console.error(error);

  return (
    <ErrorLayout>
      <Container className="text-center">
        <p className="font-semibold">Une erreur est survenue</p>
      </Container>
    </ErrorLayout>
  );
}
