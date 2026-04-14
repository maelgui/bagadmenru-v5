import Container from '../../components/container';
import Input from '../../components/input';

export default function ExportCalPage() {
  return (
    <Container>
      <h2>Synchronisation Google Calendar</h2>
      <Input value={`${window.location.origin}/api/v1/events/export/ics`} />
    </Container>
  );
}
