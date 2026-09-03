import {
  CalendarPlus, Check, CircleCheck, CircleHelp, CircleX, Edit3, ExternalLink, Sparkles, X,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Event, MinimalGroup, Profile, Response } from 'bagad-client';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import AvatarGroup from '../../components/avatar-group';
import Container from '../../components/container';
import Header from '../../components/header';
import {
  queryClient, useApiClient, usePermissions, useUserProfile,
} from '../../config/client';
import groupBy from '../../utils/groupby';
import sum from '../../utils/sum';
import DisplaySelector from './components/selector';
import { upcomingDoodleEventsQuery, upcomingResponsesQuery } from './queries';

type EnrichedResponse = Response & { user?: Profile };

function groupResponsesByEventAndEnrichUser(responses: Response[], profiles: Profile[]) {
  return groupBy(responses.map((response) => ({
    ...response,
    user: profiles.find((profile) => profile.id === response.userId),
  })), (response) => response.eventId);
}

function ResponseIcon({ value }: { value: boolean | undefined }) {
  if (value === true) return <CircleCheck className="text-emerald-500" aria-label="Présent" />;
  if (value === false) return <CircleX className="text-destructive" aria-label="Absent" />;
  return <CircleHelp className="text-sky-500" aria-label="Sans réponse" />;
}

function ProfileLine({ profile, trailing }: { profile?: Profile; trailing?: React.ReactNode }) {
  const color = profile?.instrument?.color ?? '';
  return (
    <div key={profile?.id} className="flex items-center">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="mx-2 text-nowrap">{profile?.firstName} {profile?.lastName}</span>
      {trailing}
    </div>
  );
}

function ResponseListItem({ response = undefined, user = undefined, showResponse = true }: { response?: EnrichedResponse; user?: Profile; showResponse?: boolean }) {
  const trailing = showResponse ? (
    <div className="ml-auto">
      <ResponseIcon value={response?.value} />
    </div>
  ) : null;
  return <ProfileLine profile={response?.user ?? user} trailing={trailing} />;
}

function responseSortFn(first: EnrichedResponse, second: EnrichedResponse) {
  const firstString = `${!first.value}-${first.user?.instrument?.id}`;
  const secondString = `${!second.value}-${second.user?.instrument?.id}`;
  return firstString > secondString ? 1 : -1;
}

function AnswerButtons({
  current, disabled, onAnswer,
}: {
  current?: boolean;
  disabled: boolean;
  onAnswer: (value: boolean) => void;
}) {
  return (
    <div className="flex justify-center gap-2">
      <Button variant={current === true ? 'default' : 'outline'} size="sm" disabled={disabled} onClick={() => onAnswer(true)}>
        <Check data-icon="inline-start" />
        Je participe
      </Button>
      <Button variant={current === false ? 'default' : 'outline'} size="sm" disabled={disabled} onClick={() => onAnswer(false)}>
        <X data-icon="inline-start" />
        Je ne participe pas
      </Button>
    </div>
  );
}

function MyResponseBlock({
  myResponse, isSaving, onAnswer,
}: {
  myResponse?: EnrichedResponse;
  isSaving: boolean;
  onAnswer: (value: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="mt-4">
      <h4 className="flex items-baseline justify-between pb-1 font-semibold">
        Votre réponse
        {myResponse && !editing ? (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Edit3 data-icon="inline-start" />
            Modifier
          </Button>
        ) : null}
      </h4>
      {myResponse === undefined || editing ? (
        <AnswerButtons current={myResponse?.value} disabled={isSaving} onAnswer={onAnswer} />
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <ResponseIcon value={myResponse.value} />
          {myResponse.value ? 'Vous serez présent' : 'Vous ne serez pas présent'}
        </div>
      )}
    </div>
  );
}

function ResponsesDialog({
  event, responses, instruments, profiles, responseByInstrument, open, onOpenChange,
}: {
  event: Event;
  responses: EnrichedResponse[];
  instruments: MinimalGroup[];
  profiles: Profile[];
  responseByInstrument: Map<number | undefined, EnrichedResponse[]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const noResponseProfiles = profiles.filter((person) => !responses.find((response) => response.userId === person.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réponses pour l&apos;évènement <i>{event.title}</i></DialogTitle>
          <DialogDescription>
            <strong>{responses.filter((response) => response.value).length} réponses positives</strong> sur {responses.length} réponses
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <ul>
            {instruments.map((instrument) => (
              <li key={instrument.id}>
                {responseByInstrument.get(instrument.id)?.filter((response) => response.value).length} {instrument.name}
              </li>
            ))}
          </ul>
          <div>
            {responses.slice().sort(responseSortFn).map((response) => <ResponseListItem key={`${event.id}-${response.userId}`} response={response} />)}
            <hr className="my-8 border-border" />
            {noResponseProfiles.map((user) => <ResponseListItem key={`${event.id}-${user.id}`} user={user} />)}
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Fermer</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function useEventResponsesSummary(responses: EnrichedResponse[], instruments: MinimalGroup[]) {
  const profile = useUserProfile();
  const responseByInstrument = useMemo(() => groupBy(responses, (response) => response.user?.instrument?.id), [responses]);

  const summary = useMemo(() => {
    const otherInstruments = instruments.filter((instrument) => instrument.id !== profile?.instrument?.id);
    const positiveFor = (instrumentId: number | undefined) => responseByInstrument.get(instrumentId)?.filter((response) => response.value) ?? [];
    return {
      myResponse: responses.find((response) => response.userId === profile?.id),
      myInstrumentResponses: positiveFor(profile?.instrument?.id),
      otherInstrumentsResponses: otherInstruments.flatMap((instrument) => positiveFor(instrument.id)),
      totalOtherInstrumentsResponses: sum(otherInstruments.map((instrument) => positiveFor(instrument.id).length)),
    };
  }, [instruments, responses, responseByInstrument, profile?.instrument?.id, profile?.id]);

  return { ...summary, responseByInstrument };
}

function EventCard({
  event, responses, instruments, profiles,
}: { event: Event; responses: EnrichedResponse[]; instruments: MinimalGroup[]; profiles: Profile[] }) {
  const { eventsApi } = useApiClient();
  const [openUserList, setOpenUserList] = useState(false);
  const {
    myResponse, myInstrumentResponses, otherInstrumentsResponses, totalOtherInstrumentsResponses, responseByInstrument,
  } = useEventResponsesSummary(responses, instruments);

  const mutation = useMutation({
    mutationFn: async (response: boolean) => await eventsApi.createResponseApiV1EventsEventIdResponsesPut({
      eventId: event.id,
      responseCreate: { value: response },
    }),
    onSettled: async () => await queryClient.invalidateQueries({ queryKey: ['responses'] }),
    onSuccess: () => toast.add({ title: 'Réponse enregistrée', type: 'success' }),
  });

  return (
    <div className="overflow-hidden surface rounded-4xl">
      <div className="flex flex-col justify-center border-b border-border/70 bg-primary/5 p-6 text-center">
        <span className="font-heading text-3xl text-primary">{event.date.getDate()}</span>
        <span className="text-sm text-muted-foreground uppercase">{event.date.toLocaleString('fr', { month: 'long' })}</span>
      </div>
      <div className="p-4">
        <h3 className="pb-1 font-semibold">{event.title}</h3>
        <div className="text-sm">{event.description}</div>
        <div className="my-4">
          <h4 className="flex items-baseline justify-between pb-1 font-semibold">
            Participants
            <Button variant="ghost" size="sm" onClick={() => setOpenUserList(true)}>
              <ExternalLink data-icon="inline-start" />
              Liste complète
            </Button>
          </h4>
          <AvatarGroup
            avatars={myInstrumentResponses.map((response) => ({
              id: response.userId,
              name: `${response.user?.firstName} ${response.user?.lastName}`,
              src: response.user?.pictureUrl,
            }))}
            extraCount={totalOtherInstrumentsResponses}
            extraTooltip={otherInstrumentsResponses.map((response) => (
              <ResponseListItem
                key={response.userId}
                showResponse={false}
                response={response}
                user={profiles.find((person) => person.id === response.userId)}
              />
            ))}
            emptyMessage="Aucun participant"
          />
        </div>
        <MyResponseBlock myResponse={myResponse} isSaving={mutation.isPending} onAnswer={(value) => mutation.mutate(value)} />
      </div>
      <ResponsesDialog
        event={event}
        responses={responses}
        instruments={instruments}
        profiles={profiles}
        responseByInstrument={responseByInstrument}
        open={openUserList}
        onOpenChange={setOpenUserList}
      />
    </div>
  );
}

export default function PlanningPage() {
  const { usersApi, eventsApi } = useApiClient();
  const { can } = usePermissions();
  const { data: events } = useQuery(upcomingDoodleEventsQuery(eventsApi));
  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: async () => await usersApi.listProfilesApiV1ProfilesGet() });
  const { data: responses } = useQuery(upcomingResponsesQuery(eventsApi));

  const { filteredProfiles, enrichedResponses } = useMemo(() => ({
    filteredProfiles: profiles?.filter((profile) => responses?.find((response) => response.userId === profile.id)) ?? [],
    enrichedResponses: groupResponsesByEventAndEnrichUser(responses ?? [], profiles ?? []),
  }), [profiles, responses]);

  const instruments: MinimalGroup[] = useMemo(() => {
    const profileInstruments = profiles?.map((profile) => profile.instrument).filter((instrument) => !!instrument) ?? [];
    return [...new Map(profileInstruments.map((instrument) => [instrument.id, instrument])).values()];
  }, [profiles]);

  return (
    <>
      <Header
        title="Planning"
        subtitle="Mes présences aux évènements du groupe"
        actions={[
          <Link key="add-event" to="/events/manage" className={cn(buttonVariants({ variant: 'outline' }), can('edit', 'event') ? '' : 'hidden')}>
            <CalendarPlus data-icon="inline-start" />
            Gérer
          </Link>,
          <DisplaySelector key="doodle-nav" />,
        ]}
        breadcrumb={[{ title: 'Évènements', link: '/events' }, { title: 'Planning' }]}
      />
      <Container>
        <Alert className="mb-8">
          <Sparkles />
          <AlertDescription>
            <p className="pb-4 font-semibold">Nouvelle vue sur mobile</p>
            <p className="pb-4">Pour une meilleure expérience sur mobile, cette page a été ajoutée. Elle remplace le grand tableau des présences, difficile à remplir sur petits écrans.</p>
            <p className="pb-4"><strong className="font-semibold">Vous préfériez le tableau ?</strong><br />Pas de panique, il est toujours disponible grâce au bouton ci-dessous.</p>
            <Link className={buttonVariants({ variant: 'ghost' })} to="/events/?noRedirect=true">
              <Sparkles data-icon="inline-start" />
              Accéder au tableau
            </Link>
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events?.map((event) => <EventCard key={event.id} event={event} responses={enrichedResponses.get(event.id) ?? []} instruments={instruments} profiles={filteredProfiles} />)}
        </div>
      </Container>
    </>
  );
}
