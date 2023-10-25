/* eslint-disable react/jsx-props-no-spreading */
import Container from '../../components/container';
import ErrorLayout from '../../layout/error';

export default function LoadingComponent() {
  return (
    <ErrorLayout>
      <Container className="text-center font-semibold">
        Chargement
      </Container>
    </ErrorLayout>
  );
}
