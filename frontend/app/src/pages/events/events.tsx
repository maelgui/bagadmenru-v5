import {
  MoreVertical, Pencil, PlusCircle, Trash2, TriangleAlert,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Event } from 'bagad-client';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import EventCategories from '../../utils/event-category';
import IcsExportButton from './components/ics-export';

function EventRow({ event }: { event: Event }) {
  const { eventsApi } = useApiClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const category = EventCategories[event.category];

  // The mutation lives in the row so the confirm dialog can stay open with a
  // pending (disabled + spinner) action until the row actually disappears.
  // Closing the dialog on click let the row linger during a slow delete, and
  // a re-confirmation fired a second DELETE ending in a 404.
  const { mutate: deleteEvent, isPending: isDeleting } = useMutation({
    mutationFn: async () => await eventsApi.deleteEventApiV1EventsEventIdDelete({ eventId: event.id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      setConfirmOpen(false);
    },
    onError: () => {
      toast.add({ title: 'Une erreur est survenue.', type: 'error' });
    },
  });

  return (
    <Item variant="outline">
      <ItemMedia>
        <div className="w-24 shrink-0 text-sm leading-tight">
          <div className="font-semibold text-foreground">
            {event.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </div>
          <div className="text-muted-foreground">
            {event.date.toLocaleDateString('fr-FR', { year: 'numeric' })}
          </div>
        </div>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <Link
            to={`/events/edit/${event.id}`}
            className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {event.title}
          </Link>
        </ItemTitle>
        <ItemDescription>{event.description}</ItemDescription>
      </ItemContent>
      <ItemActions className="gap-3">
        <Badge className={category?.className} variant={category?.variant ?? 'default'}>
          {category?.name ?? event.category}
        </Badge>
        <Separator orientation="vertical" className="h-6 self-center!" />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions pour ${event.title}`}
              />
            )}
          >
            <MoreVertical aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link to={`/events/edit/${event.id}`} />}>
              <Pencil data-icon="inline-start" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 data-icon="inline-start" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet évènement ?</AlertDialogTitle>
            <AlertDialogDescription>
              {`L'évènement « ${event.title} » et les réponses associées seront définitivement supprimés.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              pending={isDeleting}
              onClick={() => deleteEvent()}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Item>
  );
}

export default function EventsManagePage() {
  const { eventsApi } = useApiClient();
  const { data: events } = useQuery({
    queryKey: ['events', 'list', { limit: 100, ordering: '-date' }],
    queryFn: async () => await eventsApi.listEventsApiV1EventsGet({ limit: 100, ordering: '-date' }),
  });

  return (
    <>
      <Header
        title="Gestion des évènements"
        subtitle="Ajouter, modifier, supprimer..."
        actions={[
          <IcsExportButton key="ics-export" />,
          <Link key="add-event" to="/events/add" className={cn(buttonVariants())}>
            <PlusCircle data-icon="inline-start" />
            Ajouter
          </Link>,
        ]}
        breadcrumb={[{ title: 'Évènements', link: '/events' }, { title: 'Gestion des évènements' }]}
      />
      <Container>
        {events?.length ? (
          <ItemGroup>
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ItemGroup>
        ) : (
          <Alert>
            <TriangleAlert />
            <AlertDescription>Aucun évènement</AlertDescription>
          </Alert>
        )}
      </Container>
    </>
  );
}
