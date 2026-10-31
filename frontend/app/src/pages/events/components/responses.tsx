import {
  Check, CircleCheck, CircleHelp, CircleX, Edit3, ExternalLink, X,
} from 'lucide-react';
import type { Event, MinimalGroup, Profile, Response } from 'bagad-client';
import { useMemo, useState } from 'react';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Button } from '@/components/ui/button';
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
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import AvatarGroup from '../../../components/avatar-group';
import { useUserProfile } from '../../../config/client';
import groupBy from '../../../utils/groupby';
import sum from '../../../utils/sum';

export type EnrichedResponse = Response & { user?: Profile };

const PERCENT = 100;

export function enrichResponses(responses: Response[], profiles: Profile[]): EnrichedResponse[] {
  return responses.map((response) => ({
    ...response,
    user: profiles.find((profile) => profile.id === response.userId),
  }));
}

export function groupResponsesByEventAndEnrichUser(responses: Response[], profiles: Profile[]) {
  return groupBy(enrichResponses(responses, profiles), (response) => response.eventId);
}

export function instrumentsOf(profiles: Profile[]): MinimalGroup[] {
  const profileInstruments = profiles.map((profile) => profile.instrument).filter((instrument) => !!instrument);
  return [...new Map(profileInstruments.map((instrument) => [instrument.id, instrument])).values()];
}

export function ResponseIcon({ value }: { value: boolean | undefined }) {
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
  current = undefined, pendingValue = undefined, disabled, onAnswer,
}: {
  current?: boolean;
  pendingValue?: boolean;
  disabled: boolean;
  onAnswer: (value: boolean) => void;
}) {
  const selected = current === undefined ? [] : [current ? 'yes' : 'no'];
  const selectedClass = 'aria-pressed:bg-primary/10 aria-pressed:text-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary';
  return (
    <div className="flex justify-center">
      <ToggleGroup variant="outline" size="sm" spacing={0} value={selected} disabled={disabled}>
        <ToggleGroupItem value="yes" className={selectedClass} onClick={() => onAnswer(true)}>
          {pendingValue === true ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
          Je participe
        </ToggleGroupItem>
        <ToggleGroupItem value="no" className={selectedClass} onClick={() => onAnswer(false)}>
          {pendingValue === false ? <Spinner data-icon="inline-start" /> : <X data-icon="inline-start" />}
          Je ne participe pas
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function MyResponseBlock({
  myResponse = undefined, isSaving, pendingValue = undefined, onAnswer,
}: {
  myResponse?: EnrichedResponse;
  isSaving: boolean;
  pendingValue?: boolean;
  onAnswer: (value: boolean) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);

  const handleAnswer = async (value: boolean) => {
    try {
      await onAnswer(value);
      setEditing(false);
    } catch {
      // La sauvegarde a échoué (toast d'erreur déjà affiché) : on reste en mode édition.
    }
  };

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
        <AnswerButtons current={myResponse?.value} disabled={isSaving} pendingValue={pendingValue} onAnswer={handleAnswer} />
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <ResponseIcon value={myResponse.value} />
          {myResponse.value ? 'Vous serez présent' : 'Vous ne serez pas présent'}
        </div>
      )}
    </div>
  );
}

export function ResponsesDialog({
  event, responses, instruments, profiles, responseByInstrument, totalMembers, open, onOpenChange,
}: {
  event: Event;
  responses: EnrichedResponse[];
  instruments: MinimalGroup[];
  profiles: Profile[];
  responseByInstrument: Map<number | undefined, EnrichedResponse[]>;
  totalMembers: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const noResponseProfiles = profiles.filter((person) => !responses.find((response) => response.userId === person.id));
  const presentCount = responses.filter((response) => response.value).length;
  const responseRate = totalMembers > 0 ? Math.round((responses.length / totalMembers) * PERCENT) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réponses pour l&apos;évènement <i>{event.title}</i></DialogTitle>
          <DialogDescription>
            Détail des réponses par membre
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center justify-center gap-1 p-4">
              <span className="font-heading text-3xl text-primary">{presentCount}</span>
              <span className="text-sm text-muted-foreground">présent{presentCount > 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 p-4">
              <CircularProgress
                value={responseRate}
                size={52}
                label={<span className="font-heading text-xs text-primary">{responseRate}%</span>}
                aria-label={`${responses.length} réponses sur ${totalMembers} membres`}
              />
              <span className="text-sm text-muted-foreground">de réponses ({responses.length}/{totalMembers})</span>
            </div>
          </div>
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

export function useEventResponsesSummary(responses: EnrichedResponse[], instruments: MinimalGroup[]) {
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

export function ParticipantsBlock({
  event, responses, instruments, profiles, totalMembers,
}: {
  event: Event;
  responses: EnrichedResponse[];
  instruments: MinimalGroup[];
  profiles: Profile[];
  totalMembers: number;
}) {
  const [openUserList, setOpenUserList] = useState(false);
  const {
    myInstrumentResponses, otherInstrumentsResponses, totalOtherInstrumentsResponses, responseByInstrument,
  } = useEventResponsesSummary(responses, instruments);

  return (
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
      <ResponsesDialog
        event={event}
        responses={responses}
        instruments={instruments}
        profiles={profiles}
        responseByInstrument={responseByInstrument}
        totalMembers={totalMembers}
        open={openUserList}
        onOpenChange={setOpenUserList}
      />
    </div>
  );
}
