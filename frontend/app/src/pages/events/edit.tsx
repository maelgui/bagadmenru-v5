import { Trash2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { EventCreate } from 'bagad-client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/toast';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient } from '../../config/client';
import EventForm from './components/form';

export default function EditEventPage() {
  const { eventsApi } = useApiClient();
  const { eventId } = useParams<'eventId'>();
  if (!eventId) throw new Error('No event id');
  const parsedEventId = parseInt(eventId, 10);
  const { data } = useQuery({
    queryKey: ['events', eventId],
    queryFn: async () => await eventsApi.getEventApiV1EventsEventIdGet({ eventId: parsedEventId }),
  });

  const navigate = useNavigate();
  const { mutateAsync } = useMutation({
    mutationFn: async (event: EventCreate) => await eventsApi.updateEventApiV1EventsEventIdPut({ eventId: parsedEventId, eventCreate: event }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      void navigate('/events/manage');
    },
    onError: (error) => {
      toast.add({ title: `Erreur lors de la modification de l'évènement : ${error.message}`, type: 'error' });
    },
  });
  // Await the mutation so react-hook-form's isSubmitting reflects it: with a
  // fire-and-forget mutate() the submit button never disables and a slow
  // network allows double submits.
  const onSubmit = async (event: EventCreate) => await mutateAsync(event);

  const { mutate: deleteMutation, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => await eventsApi.deleteEventApiV1EventsEventIdDelete({ eventId: id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'], refetchType: 'none' });
      void navigate('/events/manage');
    },
  });

  return (
    <>
      <Header
        title="Modifier un évènement"
        subtitle="Sortie/répétition/réunion..."
        breadcrumb={[
          { link: '/events', title: 'Évènements' },
          { link: '/events/manage', title: 'Gestion des évènements' },
          { title: 'Modifier un évènement' },
        ]}
        actions={[
          <AlertDialog key="event.delete">
            <AlertDialogTrigger render={<Header.Action size="sm" variant="outline" />}>
              <Trash2 data-icon="inline-start" />
              Supprimer
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cet évènement ?</AlertDialogTitle>
                <AlertDialogDescription>
                  {`L'évènement « ${data?.title ?? ''} » et les réponses associées seront définitivement supprimés.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  pending={isDeleting}
                  onClick={() => deleteMutation(parsedEventId)}
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>,
        ]}
      />
      <Container>
        {data ? <EventForm onSubmit={onSubmit} data={data} /> : 'Chargement'}
      </Container>
    </>
  );
}
