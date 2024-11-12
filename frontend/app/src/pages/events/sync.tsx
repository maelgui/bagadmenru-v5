import Container from '../../components/container';
import Input from '../../components/input';
import env from '../../env';

export default function ExportCalPage() {
  return (
    <Container>
      <h2>Synchronisation Google Calendar</h2>
      <Input value={env.VITE_BBE2_API_URL} />
    </Container>
  );
}
