import { useOidcIdToken } from '@axa-fr/react-oidc';
import { faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ResponseCreate } from 'bagad-client';
import Button from '../../components/button';
import Container from '../../components/container';
import { queryClient, useApiClient } from '../../config/client';
import EventListItem from './components/event';

export default function AnswerLinkPage() {
  const { idTokenPayload } = useOidcIdToken();

  const { eventsApi } = useApiClient();
  const eventId = 1;

  const { data: event } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.getEventApiV1EventsEventIdGet({ eventId }),
  });

  const { data: response } = useQuery({
    queryKey: ['responses', 'me'],
    queryFn: () => eventsApi.listResponsesApiV1ResponsesGet({ userId: idTokenPayload.sub }),
    select: (data) => data.filter((r) => r.eventId === eventId).at(0),
  });

  const mutation = useMutation({
    mutationFn: ({ r }: { r: ResponseCreate }) => {
      const params = { eventId, responseCreate: r };
      return eventsApi.createResponseApiV1EventsEventIdResponsesPut(params);
    },
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
