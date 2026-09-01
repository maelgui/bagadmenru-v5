import { ArrowLeft, Check, CircleCheck, CircleX, OctagonX, X } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Event, Response, ResponseCreate } from 'bagad-client';
import { Link, useParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { queryClient, useApiClient } from '../../config/client';
import EventListItem, { EventListItemSkeleton } from './components/event';

function ResponseConfirmation({ event, response }: { event: Event, response: Response }) {
  const eventDate = (
    <time dateTime={event.date.toISOString()}>{event.date.toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time>
  );

  return (
    <div className="flex flex-col gap-4 text-center">
      <div className="rounded-lg border border-border bg-muted p-6">
        {response.value ? (
          <div className="flex flex-col gap-2">
            <CircleCheck className="mx-auto size-8 text-emerald-500" aria-hidden="true" />
            <p className="text-lg font-medium text-foreground">Vous serez présent</p>
            <p className="text-sm text-muted-foreground">
              Votre présence à <span className="font-semibold">{event.title}</span> du {eventDate} a bien été enregistrée.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <CircleX className="mx-auto size-8 text-destructive" aria-hidden="true" />
            <p className="text-lg font-medium text-foreground">Vous ne serez pas présent</p>
            <p className="text-sm text-muted-foreground">
              Votre absence à <span className="font-semibold">{event.title}</span> du {eventDate} a bien été enregistrée.
            </p>
          </div>
        )}
      </div>
      <div className="pt-2">
        <Link className={buttonVariants({ variant: 'ghost' })} to="/">
          <ArrowLeft data-icon="inline-start" />
          Retour au site
        </Link>
      </div>
    </div>
  );
}

function AnswerButtons({
  isPending, pendingValue, onAnswer,
}: {
  isPending: boolean;
  pendingValue: boolean | undefined;
  onAnswer: (value: boolean) => void;
}) {
  const isSubmittingYes = isPending && pendingValue === true;
  const isSubmittingNo = isPending && pendingValue === false;

  return (
    <div className="flex flex-col gap-6 text-center">
      <h2 className="text-lg font-medium text-foreground">Serez-vous présent à cet événement ?</h2>
      <div className="flex justify-center gap-4" role="group" aria-label="Choix de présence">
        <Button
          type="button"
          className="rounded-full"
          disabled={isPending}
          onClick={() => onAnswer(true)}
        >
          {isSubmittingYes ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
          Oui, je serai là
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          disabled={isPending}
          onClick={() => onAnswer(false)}
        >
          {isSubmittingNo ? <Spinner data-icon="inline-start" /> : <X data-icon="inline-start" />}
          Non, absent
        </Button>
      </div>
    </div>
  );
}

export default function AnswerLinkPage() {
  const { token } = useParams<'token'>();
  const { eventsApi } = useApiClient();
  if (!token) throw new Error('Missing token');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['response_view_by_token', token],
    queryFn: async () => await eventsApi.getResponseByTokenApiV1ResponsesLinkPrepareGet({ token }),
  });
  const mutation = useMutation({
    mutationFn: async ({ response }: { response: ResponseCreate }) => await eventsApi.createResponseByTokenApiV1ResponsesLinkSavePut({ responseCreate: response, token }),
    onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['response_view_by_token', token] }),
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl">Répondre à un événement</h1>
      <p className="mb-8 text-muted-foreground">Confirmez votre présence en un clic</p>
      {isLoading ? (
        <div role="status" aria-label="Chargement" className="flex flex-col gap-4">
          <EventListItemSkeleton className="mb-8 rounded border-2 border-border p-4" />
          <p className="text-center text-muted-foreground">Chargement en cours…</p>
        </div>
      ) : null}
      {isError ? (
        <Alert variant="destructive">
          <OctagonX />
          <AlertTitle>Impossible de charger l&apos;événement</AlertTitle>
          <AlertDescription>Le lien est peut-être invalide ou expiré. Veuillez vérifier votre email ou contacter un administrateur.</AlertDescription>
        </Alert>
      ) : null}
      {data ? (
        <div className="flex flex-col gap-6">
          <EventListItem event={data.event} className="mb-8 rounded border-2 border-primary shadow-sm" />
          <div aria-live="polite" aria-atomic="true">
            {mutation.isError ? (
              <Alert variant="destructive">
                <OctagonX />
                <AlertDescription>Une erreur est survenue lors de l&apos;enregistrement de votre réponse. Veuillez réessayer.</AlertDescription>
              </Alert>
            ) : null}
            {data.response ? (
              <ResponseConfirmation event={data.event} response={data.response} />
            ) : (
              <AnswerButtons
                isPending={mutation.isPending}
                pendingValue={mutation.variables?.response.value ?? undefined}
                onAnswer={(value) => mutation.mutate({ response: { value } })}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
