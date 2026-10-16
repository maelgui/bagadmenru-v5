import { useMutation, useQuery } from '@tanstack/react-query';
import type { Event } from 'bagad-client';
import { ResponseError } from 'bagad-client';
import { Link, Search } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { queryClient, useApiClient } from '../../../config/client';
import EventCategories from '../../../utils/event-category';

const HTTP_CONFLICT = 409;

interface EventLinkerProps {
  campaignId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EventLinker({ campaignId, open, onOpenChange }: EventLinkerProps) {
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { eventsApi, campaignsApi } = useApiClient();

  const { data: events, isPending } = useQuery<Event[]>({
    queryKey: ['events', 'linkable'],
    queryFn: async () => await eventsApi.listEventsApiV1EventsGet({ limit: 200, linkable: true }),
    enabled: open,
  });

  const linkMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await campaignsApi.linkEventApiV1CampaignsCampaignIdEventsEventIdPost({ campaignId, eventId });
    },
    onSuccess: async () => {
      setErrorMessage(null);
      toast.add({ title: 'Évènement lié à la campagne', type: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId] });
      await queryClient.invalidateQueries({ queryKey: ['events', 'linkable'] });
    },
    onError: (error: Error) => {
      if (error instanceof ResponseError && error.response.status === HTTP_CONFLICT) {
        setErrorMessage('Cet évènement est déjà lié à une autre campagne.');
      } else {
        setErrorMessage(`Erreur lors du lien : ${error.message}`);
      }
    },
  });

  const term = search.trim().toLowerCase();
  const filteredEvents = events?.filter(
    (event) => !term || event.title.toLowerCase().includes(term) || formatDate(event.date).toLowerCase().includes(term),
  ) ?? [];

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSearch('');
      setErrorMessage(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lier un évènement</DialogTitle>
          <DialogDescription>
            Rattachez un évènement existant à cette campagne.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Rechercher un évènement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Rechercher un évènement"
          />
        </div>

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <DialogBody className="max-h-80">
          {isPending ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Chargement…</p>
          ) : filteredEvents.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {filteredEvents.map((event) => {
                const category = EventCategories[event.category];
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
                      onClick={() => linkMutation.mutate(event.id)}
                      disabled={linkMutation.isPending}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium">{event.title}</span>
                          <Badge className={category?.className} variant={category?.variant ?? 'default'}>
                            {category?.name ?? event.category}
                          </Badge>
                        </span>
                        <span className="text-sm text-muted-foreground">{formatDate(event.date)}</span>
                      </span>
                      <Link className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucun évènement trouvé.</p>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
