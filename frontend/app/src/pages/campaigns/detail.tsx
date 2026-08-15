import {
    faArrowLeft, faBoxArchive, faBullhorn, faEdit, faLink, faLinkSlash, faPlus, faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Campaign, CampaignEvent } from 'bagad-client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Alert from '../../components/alert';
import Badge from '../../components/badge';
import Button from '../../components/button';
import Container from '../../components/container';
import {
    Dialog, DialogClose, DialogContent, DialogDescription, DialogHeading,
} from '../../components/dialog';
import Header from '../../components/header';
import { queryClient, useApiClient, usePermissions, useUserProfile } from '../../config/client';
import EventCategories from '../../utils/event-category';
import EventLinker from './components/EventLinker';
import StatusBadge from './components/StatusBadge';

function formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateLong(date: Date): string {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function CampaignMeta({ campaign }: { campaign: Campaign }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={campaign.status} />
                <Badge
                    style={campaign.group.color ? { backgroundColor: campaign.group.color } : undefined}
                    variant={campaign.group.color ? undefined : 'default'}
                >
                    {campaign.group.name}
                </Badge>
            </div>
            {campaign.firstEventDate && campaign.lastEventDate ? (
                <div className="text-sm text-gray-600">
                    {formatDate(campaign.firstEventDate)}
                    {campaign.lastEventDate.getTime() !== campaign.firstEventDate.getTime()
                        ? ` – ${formatDate(campaign.lastEventDate)}`
                        : ''}
                </div>
            ) : null}
            {campaign.description ? (
                <p className="text-gray-700">{campaign.description}</p>
            ) : null}
        </div>
    );
}

interface ManagerActionBarProps {
    status: string;
    campaignId: number;
    publishPending: boolean;
    archivePending: boolean;
    onPublish: () => void;
    onArchive: () => void;
    onOpenLinker: () => void;
    onOpenDelete: () => void;
}

function ManagerActionBar({
    status, campaignId, publishPending, archivePending, onPublish, onArchive, onOpenLinker, onOpenDelete,
}: ManagerActionBarProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {status === 'draft' ? (
                <Button icon={faBullhorn} size="sm" isLoading={publishPending} onClick={onPublish}>
                    Publier
                </Button>
            ) : null}
            {status === 'active' ? (
                <Button variant="outline" icon={faBoxArchive} size="sm" isLoading={archivePending} onClick={onArchive}>
                    Archiver
                </Button>
            ) : null}
            <Button variant="outline" icon={faPlus} size="sm" as={Link} to={`/events/add?campaign=${campaignId}`}>
                Créer un évènement
            </Button>
            <Button variant="outline" icon={faLink} size="sm" onClick={onOpenLinker}>
                Lier des évènements
            </Button>
            <Button
                variant="outline"
                icon={faTrash}
                size="sm"
                className="border-red-500! text-red-600! hover:bg-red-500! hover:text-white! hover:ring-red-500!"
                onClick={onOpenDelete}
            >
                Supprimer
            </Button>
        </div>
    );
}

interface LinkedEventRowProps {
    event: CampaignEvent;
    isManager: boolean;
    unlinkPending: boolean;
    onUnlink: (eventId: number) => void;
}

function LinkedEventRow({
    event, isManager, unlinkPending, onUnlink,
}: LinkedEventRowProps) {
    const cat = EventCategories[event.category];
    return (
        <li className="flex items-center gap-4 px-4 py-3 relative hover:bg-gray-50">
            <div className="flex-1 min-w-0">
                <Link to={`/events/edit/${event.id}`}>
                    <span className="absolute inset-0" />
                    <span className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 truncate">{event.title}</span>
                        <Badge variant={cat?.variant ?? 'default'}>
                            {cat?.name ?? event.category}
                        </Badge>
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                        {formatDateLong(event.date)}
                    </span>
                </Link>
            </div>
            {isManager ? (
                <Button
                    variant="ghost"
                    size="sm"
                    icon={faLinkSlash}
                    className="relative shrink-0"
                    aria-label={`Détacher ${event.title} de la campagne`}
                    isLoading={unlinkPending}
                    onClick={() => onUnlink(event.id)}
                >
                    Détacher
                </Button>
            ) : null}
        </li>
    );
}

interface LinkedEventsSectionProps {
    events: CampaignEvent[];
    isManager: boolean;
    campaignId: number;
    unlinkPendingEventId: number | undefined;
    onUnlink: (eventId: number) => void;
    onOpenLinker: () => void;
}

function LinkedEventsSection({
    events, isManager, campaignId, unlinkPendingEventId, onUnlink, onOpenLinker,
}: LinkedEventsSectionProps) {
    if (events.length > 0) {
        return (
            <ul className="divide-y divide-gray-200">
                {events.map((event) => (
                    <LinkedEventRow
                        key={event.id}
                        event={event}
                        isManager={isManager}
                        unlinkPending={unlinkPendingEventId === event.id}
                        onUnlink={onUnlink}
                    />
                ))}
            </ul>
        );
    }
    if (isManager) {
        return (
            <div className="rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-center">
                <p className="text-gray-600 mb-6">
                    Cette campagne ne contient encore aucun évènement.
                    Liez des évènements existants ou créez-en un nouveau pour préparer la campagne.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Button icon={faLink} onClick={onOpenLinker}>
                        Lier des évènements existants
                    </Button>
                    <Button variant="outline" icon={faPlus} as={Link} to={`/events/add?campaign=${campaignId}`}>
                        Créer un évènement
                    </Button>
                </div>
            </div>
        );
    }
    return <Alert type="info">Aucun évènement lié à cette campagne.</Alert>;
}

interface DeleteCampaignDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campaignName: string;
    isPending: boolean;
    onConfirm: () => void;
}

function DeleteCampaignDialog({
    open, onOpenChange, campaignName, isPending, onConfirm,
}: DeleteCampaignDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeading>
                    <div className="inline-flex mx-auto mb-4 h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
                        <FontAwesomeIcon icon={faTrash} className="h-5 w-5 text-red-600" />
                    </div>
                    <h2>Supprimer la campagne</h2>
                </DialogHeading>
                <DialogDescription>
                    <p>
                        Êtes-vous sûr de vouloir supprimer la campagne
                        {' '}
                        <strong>{campaignName}</strong>
                        {' '}
                        ? Les évènements liés ne seront pas supprimés mais seront détachés de cette campagne.
                    </p>
                    <div className="mt-4 flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button
                            className="bg-red-600! border-red-600! hover:bg-red-700!"
                            isLoading={isPending}
                            onClick={onConfirm}
                        >
                            Supprimer
                        </Button>
                    </div>
                </DialogDescription>
                <DialogClose />
            </DialogContent>
        </Dialog>
    );
}

interface CampaignContentProps {
    campaign: Campaign;
    campaignId: number;
    isCampaignManager: boolean;
    publishPending: boolean;
    archivePending: boolean;
    unlinkPendingEventId: number | undefined;
    onPublish: () => void;
    onArchive: () => void;
    onUnlink: (eventId: number) => void;
    onOpenLinker: () => void;
    onOpenDelete: () => void;
}

function CampaignContent({
    campaign, campaignId, isCampaignManager, publishPending, archivePending,
    unlinkPendingEventId, onPublish, onArchive, onUnlink, onOpenLinker, onOpenDelete,
}: CampaignContentProps) {
    const profile = useUserProfile();
    const isGroupMember = profile
        ? profile.groups.some((g) => g.id === campaign.groupId)
        : false;

    const sortedEvents = [...(campaign.events ?? [])].sort((a, b) => a.date.getTime() - b.date.getTime());

    return (
        <div className="space-y-8">
            <CampaignMeta campaign={campaign} />

            {isCampaignManager ? (
                <ManagerActionBar
                    status={campaign.status}
                    campaignId={campaignId}
                    publishPending={publishPending}
                    archivePending={archivePending}
                    onPublish={onPublish}
                    onArchive={onArchive}
                    onOpenLinker={onOpenLinker}
                    onOpenDelete={onOpenDelete}
                />
            ) : null}

            {!isGroupMember && profile ? (
                <Alert type="warning">
                    Vous n&apos;êtes pas membre du groupe <strong>{campaign.group.name}</strong>.
                    Vous ne pouvez pas répondre aux évènements de cette campagne.
                </Alert>
            ) : null}

            <div>
                <h3 className="text-2xl mb-4">Évènements liés</h3>
                <LinkedEventsSection
                    events={sortedEvents}
                    isManager={isCampaignManager}
                    campaignId={campaignId}
                    unlinkPendingEventId={unlinkPendingEventId}
                    onUnlink={onUnlink}
                    onOpenLinker={onOpenLinker}
                />
            </div>
        </div>
    );
}

export default function CampaignDetailPage() {
    const { id: idRaw } = useParams<'id'>();
    if (!idRaw) {
        throw new Error('Missing campaign id');
    }

    const campaignId = parseInt(idRaw, 10);
    const navigate = useNavigate();
    const { campaignsApi } = useApiClient();
    const { can } = usePermissions();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [eventLinkerOpen, setEventLinkerOpen] = useState(false);

    const { data: campaign, isPending } = useQuery<Campaign>({
        queryKey: ['campaigns', campaignId],
        queryFn: async () => await campaignsApi.getCampaignApiV1CampaignsCampaignIdGet({ campaignId }),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await campaignsApi.deleteCampaignApiV1CampaignsCampaignIdDelete({ campaignId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            toast.success('Campagne supprimée');
            void navigate('/campaigns');
        },
        onError: () => {
            toast.error('Erreur lors de la suppression de la campagne');
        },
    });

    const publishMutation = useMutation({
        mutationFn: async () => {
            await campaignsApi.publishCampaignApiV1CampaignsCampaignIdPublishPost({ campaignId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            void queryClient.invalidateQueries({ queryKey: ['events'] });
            toast.success('Campagne publiée');
        },
        onError: () => {
            toast.error('Erreur lors de la publication de la campagne');
        },
    });

    const archiveMutation = useMutation({
        mutationFn: async () => {
            await campaignsApi.archiveCampaignApiV1CampaignsCampaignIdArchivePost({ campaignId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            toast.success('Campagne archivée');
        },
        onError: () => {
            toast.error('Erreur lors de l\'archivage de la campagne');
        },
    });

    const unlinkMutation = useMutation({
        mutationFn: async (eventId: number) => {
            await campaignsApi.unlinkEventApiV1CampaignsCampaignIdEventsEventIdDelete({ campaignId, eventId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            void queryClient.invalidateQueries({ queryKey: ['events'] });
            toast.success('Évènement détaché de la campagne');
        },
        onError: () => {
            toast.error('Erreur lors du détachement de l\'évènement');
        },
    });

    const isCampaignManager = can('edit', 'campaign');
    const campaignName = campaign ? campaign.name : undefined;

    const headerActions = [
        <Header.Action key="back" icon={faArrowLeft} as={Link} to="/campaigns">
            Retour à la liste
        </Header.Action>,
    ];

    if (isCampaignManager) {
        headerActions.push(
            <Header.Action key="edit" icon={faEdit} variant="outline" as={Link} to={`/campaigns/${campaignId}/edit`}>
                Modifier
            </Header.Action>,
        );
    }

    return (
        <>
            <Header
                title={campaignName ?? 'Campagne'}
                actions={headerActions}
                breadcrumb={[
                    { title: 'Campagnes', link: '/campaigns' },
                    { title: campaignName ?? '...' },
                ]}
            />
            <Container>
                {isPending ? (
                    <div role="status" aria-label="Chargement" className="text-center py-8 text-gray-500">
                        Chargement de la campagne…
                    </div>
                ) : null}
                {campaign ? (
                    <CampaignContent
                        campaign={campaign}
                        campaignId={campaignId}
                        isCampaignManager={isCampaignManager}
                        publishPending={publishMutation.isPending}
                        archivePending={archiveMutation.isPending}
                        unlinkPendingEventId={unlinkMutation.isPending ? unlinkMutation.variables : undefined}
                        onPublish={() => publishMutation.mutate()}
                        onArchive={() => archiveMutation.mutate()}
                        onUnlink={(eventId) => unlinkMutation.mutate(eventId)}
                        onOpenLinker={() => setEventLinkerOpen(true)}
                        onOpenDelete={() => setDeleteDialogOpen(true)}
                    />
                ) : null}
            </Container>

            <DeleteCampaignDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                campaignName={campaignName ?? ''}
                isPending={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutate()}
            />

            <EventLinker
                campaignId={campaignId}
                open={eventLinkerOpen}
                onClose={() => setEventLinkerOpen(false)}
            />
        </>
    );
}
