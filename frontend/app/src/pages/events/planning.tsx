
import {
  faCalendarPlus,
  faCheck,
  faCircleCheck,
  faCircleQuestion,
  faCircleXmark,
  faPen,
  faSquareArrowUpRight,
  faWandMagicSparkles, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  Event,
  MinimalGroup, Profile, Response,
} from 'bagad-client';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import Alert from '../../components/alert';
import AvatarGroup from '../../components/avatar-group';
import Button from '../../components/button';
import Container from '../../components/container';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogHeading,
} from '../../components/dialog';
import Header from '../../components/header';
import {
  queryClient, useApiClient, usePermissions, useUserProfile,
} from '../../config/client';
import groupBy from '../../utils/groupby';
import sum from '../../utils/sum';
import DisplaySelector from './components/selector';

type EnrichedResponse = Response & { user?: Profile };
function groupResponsesByEventAndEnrichUser(responses: Response[], profiles: Profile[]) {
  const enrichedResponses = responses.map((r: Response) => {
    const enrichedResponse: EnrichedResponse = r;
    enrichedResponse.user = profiles.find((p) => p.id === r.userId);
    return enrichedResponse;
  });
  return groupBy(enrichedResponses, (r) => r.eventId);
}

function ResponseListItem({ response = undefined, user = undefined, showResponse = true }: { response?: EnrichedResponse, user?: Profile, showResponse?: boolean }) {
  const profile = response?.user ?? user;
  return (
    <div key={profile?.id} className="flex items-center my-2">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: profile?.instrument?.color ?? '' }}
      />
      {/* <Avatar
      src={profile?.pictureUrl}
      title={profile?.firstName}
      size="xxs"
      className="border-2"
      style={{ borderColor: profile?.instrument?.color ?? '' }}
    /> */}
      <span className="mx-2 text-nowrap">
        {profile?.firstName}
        {' '}
        {profile?.lastName}
      </span>
      {showResponse ? (
        <div className="ml-auto">
          {response ? (
            <span>
              {response.value ? (
                <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-300" />
              ) : (
                <FontAwesomeIcon icon={faCircleXmark} className="text-red-300" />
              )}
            </span>
          ) : (
            <FontAwesomeIcon icon={faCircleQuestion} className="text-sky-500" />

          )}
        </div>
      ) : null}
    </div>

  );
}

function responseSortFn(a: EnrichedResponse, b: EnrichedResponse) {
  const str1 = `${!a.value}-${a.user?.instrument?.id}`;
  const str2 = `${!b.value}-${b.user?.instrument?.id}`;
  return str1 > str2 ? 1 : -1;
}
function EventCard({
  event, responses, instruments, profiles,
}: { event: Event, responses: EnrichedResponse[], instruments: MinimalGroup[], profiles: Profile[] }) {
  const { eventsApi } = useApiClient();
  const profile = useUserProfile();
  const [editing, setEditing] = useState(false);
  const [openUserList, setOpenUserList] = useState(false);

  const responseByInstrument = useMemo(() => groupBy(responses, (r) => r.user?.instrument?.id), [responses]);

  const mutation = useMutation({
    mutationFn: async (response: boolean) => {
      const params = { eventId: event.id, responseCreate: { value: response } };
      return await eventsApi.createResponseApiV1EventsEventIdResponsesPut(params);
    },
    onSettled: async () => await queryClient.invalidateQueries({ queryKey: ['responses'] }),
    onSuccess: () => toast.success('Réponse enregistrée'),
  });

  const {
    totalOtherInstrumentsResponses, myInstrumentResponses, otherInstrumentsResponses, myResponse,
  } = useMemo(() => {
    const othersInstruments = instruments.filter((i) => i.id !== profile?.instrument?.id);
    return {
      myResponse: responses.find((r) => r.userId === profile?.id),
      myInstrumentResponses: responseByInstrument.get(profile?.instrument?.id)?.filter((r) => r.value) ?? [],
      otherInstrumentsResponses: othersInstruments.map((i) => responseByInstrument.get(i.id)?.filter((r) => r.value) ?? []).flat(),
      totalOtherInstrumentsResponses: sum(othersInstruments.map((i) => responseByInstrument.get(i.id)?.filter((r) => r.value).length ?? 0)),
    };
  }, [instruments, responses, responseByInstrument, profile?.instrument?.id, profile?.id]);

  return (
    <div key={event.id} className="shadow-md rounded-xl overflow-hidden">
      <div className="flex flex-col justify-center text-center p-8 bg-linear-to-tr from-pourpre-50 to-gray-200">
        <span className="text-xl font-bold">{event.date.getDate()}</span>
        <span>{event.date.toLocaleString('fr', { month: 'long' })}</span>
      </div>
      <div className="p-4">
        <h3 className="pb-1 font-semibold">{event.title}</h3>
        <div className="text-sm">{event.description}</div>

        <div className="my-4">
          <h4 className="pb-1 font-semibold flex items-baseline justify-between">
            Participants
            <Button
              variant="ghost"
              size="sm"
              icon={faSquareArrowUpRight}
              onClick={() => setOpenUserList(true)}
            >
              Liste complète
            </Button>
          </h4>

          <AvatarGroup
            avatars={myInstrumentResponses.map((p) => ({
              id: p.userId,
              name: `${p.user?.firstName} ${p.user?.lastName}`,
              src: p.user?.pictureUrl,
            }))}
            extraCount={totalOtherInstrumentsResponses}
            extraTooltip={
              otherInstrumentsResponses.map((r) => (
                <ResponseListItem
                  key={r.userId}
                  showResponse={false}
                  response={r}
                  user={profiles.find((p) => p.id === r.userId)}
                />
              ))
            }
            emptyMessage="Aucun participant"
          />
        </div>

        <div className="mt-4">
          <h4 className="pb-1 font-semibold flex items-baseline justify-between">
            Votre réponse
            {myResponse && !editing ? <Button size="sm" variant="ghost" icon={faPen} onClick={() => setEditing(true)}>Modifier</Button> : null}
          </h4>
          {myResponse === undefined || editing ? (
            <div className="flex justify-center">
              <Button
                icon={faCheck}
                variant={myResponse?.value ? 'solid' : 'outline'}
                size="sm"
                onClick={() => mutation.mutate(true)}
              >
                Je participe
              </Button>
              <Button
                variant={myResponse !== undefined && !myResponse.value ? 'solid' : 'outline'}
                icon={faXmark}
                size="sm"
                onClick={() => mutation.mutate(false)}
              >
                Je ne participe pas
              </Button>
            </div>
          ) : (
            <div className="text-sm">
              {responses.find((r) => r.userId === profile?.id)?.value ? (
                <>
                  <FontAwesomeIcon icon={faCircleCheck} className="px-3 text-emerald-300" />
                  Vous serez présent
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCircleXmark} className="px-3 text-red-300" />
                  Vous ne serez pas présent
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={openUserList} onOpenChange={(open) => setOpenUserList(open)}>
        <DialogContent>
          <DialogHeading>
            <h2>
              <span>Réponses pour l&apos;évènement </span>
              <i>{event.title}</i>
            </h2>
          </DialogHeading>
          <DialogDescription>
            <p className="text-left mb-4">
              <strong>
                {responses.filter((r) => r.value).length}
                {' '}
                réponses positives
              </strong>
              {' '}
              sur
              {' '}
              {responses.length}
              {' '}
              réponses
            </p>
            <ul className="text-left mb-4">
              {instruments.map((instrument) => (
                <li key={instrument.id}>
                  {responseByInstrument.get(instrument.id)?.filter((r) => r.value).length}
                  {' '}
                  {instrument.name}
                </li>
              ))}
            </ul>
            <div className="">
              {responses.sort((a, b) => responseSortFn(a, b)).map((response) => (
                <ResponseListItem key={`${event.id}-${response.userId}`} response={response} />
              ))}
              <hr className="my-8" />
              {profiles.filter((p) => !responses.find((r) => r.userId === p.id)).map((user) => (
                <ResponseListItem key={`${event.id}-${user.id}`} user={user} />
              ))}
            </div>
          </DialogDescription>
          <DialogClose />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PlanningPage() {
  const { usersApi, eventsApi } = useApiClient();
  const { can } = usePermissions();

  const { data: events } = useQuery({
    queryKey: ['events', 'next100doodle'],
    queryFn: async () => await eventsApi.listEventsApiV1EventsGet({ limit: 100, dateGte: new Date(), isInDoodle: true }),
  });
  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => await usersApi.listProfilesApiV1ProfilesGet(),
  });
  const { data: responses } = useQuery({
    queryKey: ['responses'],
    queryFn: async () => await eventsApi.listResponsesApiV1ResponsesGet({ dateGte: new Date() }),
  });

  const { filteredProfiles, enrichedResponses } = useMemo(() => ({
    filteredProfiles: profiles?.filter((p) => responses?.find((r) => r.userId === p.id)) ?? [],
    enrichedResponses: groupResponsesByEventAndEnrichUser(responses ?? [], profiles ?? []),
  }), [profiles, responses]);

  const instruments: MinimalGroup[] = useMemo(() => {
    if (!profiles) {
      return [];
    }
    const instrumentsFiltered = profiles.map((p) => p.instrument).filter((i) => !!i);
    const uniqueById = new Map(instrumentsFiltered.map((i) => [i.id, i]));
    return [...uniqueById.values()];
  }, [profiles]);

  return (
    <>
      <Header
        title="Planning"
        subtitle="Mes présences aux évènements du groupe"
        actions={[
          <Header.Action variant="outline" icon={faCalendarPlus} key="add-event" as={Link} to="/events/manage" className={can('edit', 'event') ? '' : 'hidden'}>
            Gérer
          </Header.Action>,
          <DisplaySelector key="doodle-nav" />,
        ]}
        breadcrumb={[
          { title: 'Évènements', link: '/events' },
          { title: 'Planning' },
        ]}
      />
      <Container>
        <Alert type="gradient">
          <p className="py-4 font-semibold">
            Nouvelle vue sur mobile
          </p>
          <p className="pb-4">
            Pour une meilleure expérience sur mobile, cette page a été ajoutée.
            Elle remplace le grand tableau des présences, difficile à remplir sur petits écrans.
          </p>
          <p className="pb-4">
            <strong className="font-semibold">Vous préfériez le tableau ?</strong>
            <br />
            Pas de panique, il est toujours disponible grâce au bouton ci-dessous.
          </p>
          <p className="pb-2">
            <Button
              variant="ghost"
              icon={faWandMagicSparkles}
              as={Link}
              to="/events/?noRedirect=true"
            >
              Accéder au tableau
            </Button>
          </p>
        </Alert>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events?.map((event) => (
            <EventCard key={event.id} event={event} responses={enrichedResponses.get(event.id) ?? []} instruments={instruments} profiles={filteredProfiles} />
          ))}
        </div>
      </Container>
    </>
  );
}
