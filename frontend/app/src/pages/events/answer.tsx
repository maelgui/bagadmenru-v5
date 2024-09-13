import { faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ResponseCreate } from 'bagad-client';
import { useParams } from 'react-router-dom';
import Button from '../../components/button';
import Container from '../../components/container';
import { queryClient, useApiClient, useUserProfile } from '../../config/client';
import EventListItem from './components/event';

type AnswerPageParams = {
  eventId: string;
};

export default function AnswerLinkPage() {
  const params = useParams<AnswerPageParams>();
  const profile = useUserProfile();
  const { eventsApi } = useApiClient();

  const eventId = parseInt(params.eventId!, 10);

  const { data: event } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.getEventApiV1EventsEventIdGet({ eventId }),
  });

  const { data: response } = useQuery({
    queryKey: ['responses', 'me'],
    queryFn: () => eventsApi.listResponsesApiV1ResponsesGet({ userId: profile?.id }),
    select: (data) => data.filter((r) => r.eventId === eventId).at(0),
  });

  const mutation = useMutation({
    // eslint-disable-next-line max-len
    mutationFn: ({ r }: { r: ResponseCreate }) => eventsApi.createResponseApiV1EventsEventIdResponsesPut({ eventId, responseCreate: r }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['responses'] }),
  });

  if (!event) {
    return null;
  }

  return (
    <Container className="transition-all">
      {event ? (
        <div>
          <EventListItem event={event} className="border-2 border-pourpre-400 rounded mb-8" />
          {response ? (

            <div>
              {response.value ? (
                <>
                  <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-300" />
                  {' '}
                  Vous serez présent
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCircleXmark} className="text-red-300" />
                  {' '}
                  Vous ne serez pas présent
                </>
              )}
            </div>

          ) : (
            <>
              <h4 className="mb-4 font-medium">Serez-vous présent ?</h4>
              <div className="flex justify-center ">
                <Button type="button" className="rounded-full" onClick={() => mutation.mutate({ r: { value: true } })}>Oui</Button>
                <Button type="button" className="rounded-full" onClick={() => mutation.mutate({ r: { value: false } })}>Non</Button>
                <Button type="button" className="rounded-full" disabled>Peut-être</Button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </Container>
  );
}
