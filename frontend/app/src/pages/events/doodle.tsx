import { CalendarPlus, Edit3, Info, Save } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Costume, type Response, type ResponseCreate } from 'bagad-client';
import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import Container from '../../components/container';
import Header from '../../components/header';
import {
  queryClient, useApiClient, usePermissions, useUserProfile,
} from '../../config/client';
import EventCategories from '../../utils/event-category';
import groupby from '../../utils/groupby';
import Checkbox from './components/checkbox';
import DisplaySelector from './components/selector';
import { upcomingDoodleEventsQuery, upcomingResponsesQuery } from './queries';

function sumByEvents(list: Response[]) {
  const map = new Map<number, number>();
  list.forEach((item) => {
    const { eventId } = item;
    map.set(eventId, (map.get(eventId) ?? 0) + (item.value ? 1 : 0));
  });
  return map;
}

function keyFunc(eventId: number, userId: string) {
  return `userId:${userId}|eventId:${eventId}`;
}

interface ResponsesData {
  responsesByUserAndEvent: Map<string, Response[]>;
  responsesSumByEvent: Map<number, number>;
  existingUsers: Set<string>;
}

function responseFormat(responses: Response[]): ResponsesData {
  const existingUsers = new Set(responses.map((response) => response.userId));
  const responsesByUserAndEvent = groupby(responses, (response) => keyFunc(response.eventId, response.userId));
  const responsesSumByEvent = sumByEvents(responses);
  return { responsesByUserAndEvent, responsesSumByEvent, existingUsers };
}

export default function DoodlePage() {
  const { usersApi, eventsApi } = useApiClient();
  const profile = useUserProfile();
  const [searchParams] = useSearchParams();
  const [editing, setEditing] = useState(false);

  const { data: events } = useQuery(upcomingDoodleEventsQuery(eventsApi));
  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: async () => await usersApi.listProfilesApiV1ProfilesGet() });
  const { data: responses } = useQuery({
    ...upcomingResponsesQuery(eventsApi),
    select: responseFormat,
  });

  const mutation = useMutation({
    mutationFn: async ({ eventId, response }: { eventId: number; response: ResponseCreate }) => (
      await eventsApi.createResponseApiV1EventsEventIdResponsesPut({ eventId, responseCreate: response })
    ),
    onSettled: async () => await queryClient.invalidateQueries({ queryKey: ['responses'] }),
    onSuccess: () => toast.add({ title: 'Réponse enregistrée', type: 'success' }),
  });

  const { can } = usePermissions();

  if (!searchParams.get('noRedirect') && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return <Navigate to="/events/planning" />;
  }

  return (
    <>
      <Header
        title="Doodle"
        subtitle="Mes présences aux évènements du groupe"
        actions={[
          <Link key="add-event" to="/events/manage" className={cn(buttonVariants({ variant: 'outline' }), can('edit', 'event') ? '' : 'hidden')}>
            <CalendarPlus data-icon="inline-start" />
            Gérer
          </Link>,
          <DisplaySelector key="doodle-nav" />,
        ]}
        breadcrumb={[{ link: '/events', title: 'Évènements' }, { title: 'Doodle' }]}
      />
      <Container className={cn(mutation.isPending && 'pointer-events-none opacity-50')}>
        {!events?.length ? (
          <Alert>
            <Info />
            <AlertDescription>Aucun évènement prochainement.</AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-x-auto surface rounded-4xl p-3">
            <table className="relative min-w-full table-auto">
              <thead className="sticky top-0 divide-y divide-border">
                <tr className="divide-x divide-border">
                  <th className="bg-card">{' '}</th>
                  {events.map((event) => {
                    const category = EventCategories[event.category];
                    return (
                      <th key={event.id} className="bg-card px-4 text-center">
                        <Tooltip>
                          <TooltipTrigger render={<div className="flex flex-col items-center p-1 text-center" />}>
                            <Badge variant={category?.variant ?? 'default'} className={category?.className}>
                              {category?.name ?? event.category}
                            </Badge>
                            <strong>{event.title}</strong>
                            <span className="text-sm">
                              {event.date.toLocaleDateString('fr-FR', {
                                weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
                              })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span>
                              {event.description || 'Pas de description'}
                              {event.costume !== Costume.None ? (
                                <span>
                                  <br />
                                  {event.costume === Costume.Costume ? 'En costume !' : 'En polo !'}
                                </span>
                              ) : null}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="divide-x divide-border">
                  <td>{' '}</td>
                  {events.map((event) => (
                    <td key={event.id} className="whitespace-nowrap px-4 text-center text-sm">
                      <Badge variant="secondary" className="m-1">
                        {responses?.responsesSumByEvent.get(event.id) ?? 0} présents
                      </Badge>
                    </td>
                  ))}
                </tr>
                {profiles ? profiles.filter((person) => person.id === profile?.id || responses?.existingUsers.has(person.id)).map((user) => (
                  <tr key={user.id}>
                    <th className={cn('flex h-8 items-center justify-end whitespace-nowrap', profile?.id === user.id ? 'font-bold' : 'font-normal')}>
                      <Avatar size="sm" className="mr-2 border-2" style={{ borderColor: user.instrument?.color ?? '' }}>
                        <AvatarImage src={user.pictureUrl ?? undefined} alt={`${user.firstName} ${user.lastName}`} />
                        <AvatarFallback>{`${user.firstName[0]}${user.lastName[0]}`}</AvatarFallback>
                      </Avatar>
                      <span>{`${user.firstName} ${user.lastName.slice(0, 1)}`}</span>
                    </th>
                    {events.map((event) => {
                      const value = responses?.responsesByUserAndEvent.get(keyFunc(event.id, user.id))?.at(0)?.value;
                      return (
                        <Checkbox
                          key={`${user.id}-${event.id}`}
                          disabled={profile?.id === user.id ? !editing : true}
                          value={value}
                          onClick={() => mutation.mutate({ eventId: event.id, response: { value: !value } })}
                        />
                      );
                    })}
                  </tr>
                )) : (
                  <tr>
                    <th className="flex items-center justify-end text-right">
                      <Skeleton className="mr-2 size-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </th>
                    <td />
                    <td />
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
            <Button
              type="button"
              size="icon-lg"
              className="fixed right-8 bottom-8 rounded-full shadow-md"
              aria-label={editing ? 'Enregistrer les réponses' : 'Modifier les réponses'}
              onClick={() => setEditing((current) => !current)}
            >
              {editing ? <Save /> : <Edit3 />}
            </Button>
          </div>
        )}
      </Container>
    </>
  );
}
