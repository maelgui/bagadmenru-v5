import { faLink, faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Event } from 'bagad-client';
import { ResponseError } from 'bagad-client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Badge from '../../../components/badge';
import Button from '../../../components/button';
import {
    Dialog, DialogClose, DialogContent, DialogHeading,
} from '../../../components/dialog';
import Input from '../../../components/input';
import { queryClient, useApiClient } from '../../../config/client';
import EventCategories from '../../../utils/event-category';

const HTTP_CONFLICT = 409;

interface EventLinkerProps {
    campaignId: number;
    open: boolean;
    onClose: () => void;
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EventLinker({ campaignId, open, onClose }: EventLinkerProps) {
    const [search, setSearch] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { eventsApi, campaignsApi } = useApiClient();

    const { data: events, isLoading } = useQuery<Event[]>({
        queryKey: ['events', 'linkable'],
        queryFn: async () => await eventsApi.listEventsApiV1EventsGet({ limit: 200, linkable: true }),
        enabled: open,
    });

    const linkMutation = useMutation({
        mutationFn: async (eventId: number) => {
            await campaignsApi.linkEventApiV1CampaignsCampaignIdEventsEventIdPost({
                campaignId,
                eventId,
            });
        },
        onSuccess: async () => {
            setErrorMessage(null);
            toast.success('Évènement lié à la campagne');
            // Keep the dialog open for multi-link sessions: refetching the
            // linkable query removes the newly linked event from the list.
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

    const filteredEvents = events?.filter((event) => {
        if (!search.trim()) return true;
        const term = search.toLowerCase();
        return event.title.toLowerCase().includes(term)
            || formatDate(event.date).toLowerCase().includes(term);
    }) ?? [];

    function handleSelect(eventId: number) {
        setErrorMessage(null);
        linkMutation.mutate(eventId);
    }

    function handleClose() {
        setSearch('');
        setErrorMessage(null);
        onClose();
    }

    function handleOpenChange(isOpen: boolean) {
        if (!isOpen) {
            handleClose();
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:w-1/2!">
                <DialogClose />
                <DialogHeading>Lier un évènement</DialogHeading>

                <div className="mb-4">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <FontAwesomeIcon icon={faSearch} />
                        </span>
                        <Input
                            type="text"
                            placeholder="Rechercher un évènement..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9!"
                            aria-label="Rechercher un évènement"
                        />
                    </div>
                </div>

                {errorMessage ? (
                    <div className="mb-3 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                        {errorMessage}
                    </div>
                ) : null}

                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {isLoading ? (
                        <p className="text-sm text-gray-500 py-4 text-center">Chargement…</p>
                    ) : filteredEvents.length > 0 ? (
                        filteredEvents.map((event) => {
                            const cat = EventCategories[event.category];
                            return (
                                <button
                                    key={event.id}
                                    type="button"
                                    className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleSelect(event.id)}
                                    disabled={linkMutation.isPending}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-gray-900 truncate">{event.title}</span>
                                            <Badge variant={cat?.variant ?? 'default'}>
                                                {cat?.name ?? event.category}
                                            </Badge>
                                        </div>
                                        <div className="mt-0.5 text-sm text-gray-500">
                                            {formatDate(event.date)}
                                        </div>
                                    </div>
                                    <FontAwesomeIcon icon={faLink} className="text-gray-400 shrink-0" />
                                </button>
                            );
                        })
                    ) : (
                        <p className="text-sm text-gray-500 py-4 text-center">Aucun évènement trouvé.</p>
                    )}
                </div>

                <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={handleClose}>
                        Fermer
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
