import {
  faArrowLeft,
  faCheck, faCircleCheck, faCircleXmark,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ResponseCreate } from 'bagad-client';
import { Link, useParams } from 'react-router-dom';
import Alert from '../../components/alert';
import Button from '../../components/button';
import { queryClient, useApiClient } from '../../config/client';
import EventListItem, { EventListItemSkeleton } from './components/event';

type AnswerPageParams = {
  token: string;
};

export default function AnswerLinkPage() {
  const params = useParams<AnswerPageParams>();
  const { eventsApi } = useApiClient();

  const { data, isLoading, isError } = useQuery({
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
    <div>
      <h1 className="text-2xl mb-2">
        Répondre à un événement
      </h1>
      <p className="text-gray-500 mb-8">
        Confirmez votre présence en un clic
      </p>

      {/* État de chargement */}
      {isLoading && (
        <div role="status" aria-label="Chargement">
          <EventListItemSkeleton
            className="border-2 border-gray-200 rounded mb-8 p-4"
          />
          <p className="text-center text-gray-500">
            Chargement en cours…
          </p>
        </div>
      )}

      {/* État d'erreur */}
      {isError && (
        <Alert type="error" role="alert">
          <p className="font-medium">
            Impossible de charger l&apos;événement
          </p>
          <p className="text-sm mt-1">
            Le lien est peut-être invalide ou expiré.
            Veuillez vérifier votre email
            ou contacter un administrateur.
          </p>
        </Alert>
      )}

      {/* Contenu principal */}
      {data ? (
        <div className="space-y-6">
          <EventListItem
            event={data.event}
            className="border-2 border-pourpre-400 rounded mb-8 shadow-sm"
          />

          <div aria-live="polite" aria-atomic="true">
            {/* Erreur de soumission */}
            {mutation.isError && (
              <Alert type="error" role="alert">
                <p>
                  Une erreur est survenue lors de
                  l&apos;enregistrement de votre réponse.
                  Veuillez réessayer.
                </p>
              </Alert>
            )}

            {data.response ? (
              <div className="text-center space-y-4">
                <div
                  className="p-6 rounded-lg bg-gray-50 border border-gray-200"
                >
                  {data.response.value ? (
                    <div className="space-y-2">
                      <FontAwesomeIcon
                        icon={faCircleCheck}
                        className="text-emerald-500 text-3xl"
                        aria-hidden="true"
                      />
                      <p className="text-lg font-medium text-gray-900">
                        Vous serez présent
                      </p>
                      <p className="text-sm text-gray-600">
                        Votre présence à
                        {' '}
                        <span className="font-semibold">
                          {data.event.title}
                        </span>
                        {' '}
                        du
                        {' '}
                        <time
                          dateTime={data.event.date.toISOString()}
                        >
                          {data.event.date.toLocaleDateString(
                            'fr',
                            {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            },
                          )}
                        </time>
                        {' '}
                        a bien été enregistrée.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FontAwesomeIcon
                        icon={faCircleXmark}
                        className="text-red-500 text-3xl"
                        aria-hidden="true"
                      />
                      <p className="text-lg font-medium text-gray-900">
                        Vous ne serez pas présent
                      </p>
                      <p className="text-sm text-gray-600">
                        Votre absence à
                        {' '}
                        <span className="font-semibold">
                          {data.event.title}
                        </span>
                        {' '}
                        du
                        {' '}
                        <time
                          dateTime={data.event.date.toISOString()}
                        >
                          {data.event.date.toLocaleDateString(
                            'fr',
                            {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            },
                          )}
                        </time>
                        {' '}
                        a bien été enregistrée.
                      </p>
                    </div>
                  )}
                </div>
                <div className="pt-2">
                  <Button as={Link} to="/" variant="ghost">
                    <FontAwesomeIcon
                      icon={faArrowLeft}
                      className="mr-2"
                      aria-hidden="true"
                    />
                    Retour au site
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Serez-vous présent à cet événement ?
                </h2>
                <div
                  className="flex justify-center gap-4"
                  role="group"
                  aria-label="Choix de présence"
                >
                  <Button
                    type="button"
                    icon={faCheck}
                    className="rounded-full"
                    isLoading={
                      mutation.isPending
                      && mutation.variables?.r.value === true
                    }
                    onClick={() => mutation.mutate(
                      { r: { value: true } },
                    )}
                  >
                    Oui, je serai là
                  </Button>
                  <Button
                    type="button"
                    icon={faTimes}
                    variant="outline"
                    className="rounded-full"
                    isLoading={
                      mutation.isPending
                      && mutation.variables?.r.value === false
                    }
                    onClick={() => mutation.mutate(
                      { r: { value: false } },
                    )}
                  >
                    Non, absent
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
