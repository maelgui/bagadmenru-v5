import Container from '../../components/container';
import ErrorLayout from '../../layout/error';

export default function AuthenticatingComponent() {
  return (
    <ErrorLayout>
      <Container className="text-center font-semibold">
        Authentification...
      </Container>
    </ErrorLayout>
  );
}
