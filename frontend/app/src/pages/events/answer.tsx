/* eslint-disable react/jsx-props-no-spreading */
import Button from '../../components/button';
import Container from '../../components/container';
import { useApiClient } from '../../config/client';
import EventListItem from './components/event';

export default function AnswerLinkPage() {
  const { eventsApi } = useApiClient();

  // const { data } = useQuery({
  //   queryKey: ['events', 1],
  //   queryFn: () => eventsApi.getEventApiV1EventsEventIdGet({ eventId: 1 }),
  // });

  // if (!data) {
  //   return null;
  // }

  const data = null;

  return (
    <Container className="transition-all">
      {data ? (
        <div>
          <EventListItem event={data} className="border-2 border-pourpre-400 rounded mb-8" />
          <h4 className="mb-4 font-medium">Serez-vous présent ?</h4>
          <div className="flex justify-center ">
            <Button type="button" className="rounded-full">Oui</Button>
            <Button type="button" className="rounded-full">Non</Button>
            <Button type="button" className="rounded-full" disabled>Peut-être</Button>
          </div>
        </div>
      )
        : null}
    </Container>
  );
}
