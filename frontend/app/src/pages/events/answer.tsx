import {
  faArrowLeft,
  faCheck, faCircleCheck, faCircleXmark,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ResponseCreate } from 'bagad-client';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/button';
import Container from '../../components/container';
import { queryClient, useApiClient } from '../../config/client';
import EventListItem from './components/event';

type AnswerPageParams = {
  token: string;
};

export default function AnswerLinkPage() {
  const params = useParams<AnswerPageParams>();
  const { eventsApi } = useApiClient();

  const { data } = useQuery({
    queryKey: ['response_view_by_token'],
    queryFn: () => eventsApi.getResponseByTokenApiV1ResponsesLinkPrepareGet({
      token: params.token!,
    }),
  });

  const mutation = useMutation({
    // eslint-disable-next-line max-len
    mutationFn: ({ r }: { r: ResponseCreate }) => eventsApi.createResponseByTokenApiV1ResponsesLinkSavePut({ responseCreate: r, token: params.token! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['response_view_by_token'] }),
  });

  return (
    <Container className="transition-all">
      {data ? (
        <div>
          <EventListItem event={data.event} className="border-2 border-pourpre-400 rounded mb-8" />
          {data.response ? (

            <div>
              {data.response.value ? (
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
              <div className="mt-4">
                <Button as={Link} to="/" variant="ghost">
                  <FontAwesomeIcon icon={faArrowLeft} className="mr-4" />
                  Retour au site
                </Button>
              </div>
            </div>

          ) : (
            <>
              <h4 className="mb-4 font-medium">Serez-vous présent ?</h4>
              <div className="flex justify-center ">
                <Button type="button" className="rounded-full" onClick={() => mutation.mutate({ r: { value: true } })}>
                  <FontAwesomeIcon icon={faCheck} className="mr-4" />
                  Oui
                </Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => mutation.mutate({ r: { value: false } })}>
                  <FontAwesomeIcon icon={faTimes} className="mr-4" />
                  Non
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </Container>
  );
}
