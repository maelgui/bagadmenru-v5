import { useMutation, useQuery } from '@tanstack/react-query';
import type { Campaign, CampaignEvent } from 'bagad-client';
import {
  ArrowLeft, Link2, Link2Off, Megaphone, Pencil, PlusCircle, TriangleAlert, Archive, Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import Container from '../../components/container';
import Header from '../../components/header';
import {
  queryClient, useApiClient, usePermissions, useUserProfile,
} from '../../config/client';
import EventCategories from '../../utils/event-category';
import EventLinker from './components/EventLinker';
import StatusBadge from './components/StatusBadge';

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function CampaignMeta({ campaign }: { campaign: Campaign }) {
  const sameDay = campaign.firstEventDate?.getTime() === campaign.lastEventDate?.getTime();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={campaign.status} />
        <Badge variant="outline" style={{ borderColor: campaign.group.color, color: campaign.group.color }}>
          {campaign.group.name}
        </Badge>
      </div>
      {campaign.firstEventDate && campaign.lastEventDate ? (
        <p className="text-sm text-muted-foreground">
          {formatDate(campaign.firstEventDate)}
          {sameDay ? '' : ` – ${formatDate(campaign.lastEventDate)}`}
        </p>
      ) : null}
      {campaign.description ? <p className="text-foreground">{campaign.description}</p> : null}
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
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' ? (
        <Button size="sm" disabled={publishPending} onClick={onPublish}>
          {publishPending ? <Spinner data-icon="inline-start" /> : <Megaphone data-icon="inline-start" />}
          Publier
        </Button>
      ) : null}
      {status === 'active' ? (
        <Button variant="outline" size="sm" disabled={archivePending} onClick={onArchive}>
          {archivePending ? <Spinner data-icon="inline-start" /> : <Archive data-icon="inline-start" />}
          Archiver
        </Button>
      ) : null}
      <Link to={`/events/add?campaign=${campaignId}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
        <PlusCircle data-icon="inline-start" />
        Créer un évènement
      </Link>
      <Button variant="outline" size="sm" onClick={onOpenLinker}>
        <Link2 data-icon="inline-start" />
        Lier des évènements
      </Button>
      <Button variant="destructive" size="sm" onClick={onOpenDelete}>
        <Trash2 data-icon="inline-start" />
        Supprimer
      </Button>
    </div>
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
      <ItemGroup>
        {events.map((event) => {
          const category = EventCategories[event.category];
          return (
            <Item key={event.id} variant="outline">
              <ItemContent>
                <ItemTitle>
                  <Link to={`/events/edit/${event.id}`} className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    {event.title}
                  </Link>
                  <Badge className={category?.className} variant={category?.variant ?? 'default'}>
                    {category?.name ?? event.category}
                  </Badge>
                </ItemTitle>
                <ItemDescription>{formatDateLong(event.date)}</ItemDescription>
              </ItemContent>
              {isManager ? (
                <ItemActions>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Détacher ${event.title} de la campagne`}
                    disabled={unlinkPendingEventId === event.id}
                    onClick={() => onUnlink(event.id)}
                  >
                    {unlinkPendingEventId === event.id
                      ? <Spinner data-icon="inline-start" />
                      : <Link2Off data-icon="inline-start" />}
                    Détacher
                  </Button>
                </ItemActions>
              ) : null}
            </Item>
          );
        })}
      </ItemGroup>
    );
  }
  if (isManager) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Link2 />
          </EmptyMedia>
          <EmptyTitle>Aucun évènement</EmptyTitle>
          <EmptyDescription>
            Liez des évènements existants ou créez-en un nouveau pour préparer la campagne.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={onOpenLinker}>
              <Link2 data-icon="inline-start" />
              Lier des évènements existants
            </Button>
            <Link to={`/events/add?campaign=${campaignId}`} className={cn(buttonVariants({ variant: 'outline' }))}>
              <PlusCircle data-icon="inline-start" />
              Créer un évènement
            </Link>
          </div>
        </EmptyContent>
      </Empty>
    );
  }
  return (
    <Alert>
      <TriangleAlert />
      <AlertDescription>Aucun évènement lié à cette campagne.</AlertDescription>
    </Alert>
  );
}

function CampaignContent({
  campaign, campaignId, isManager, publishPending, archivePending,
  unlinkPendingEventId, onPublish, onArchive, onUnlink, onOpenLinker, onOpenDelete,
}: {
  campaign: Campaign;
  campaignId: number;
  isManager: boolean;
  publishPending: boolean;
  archivePending: boolean;
  unlinkPendingEventId: number | undefined;
  onPublish: () => void;
  onArchive: () => void;
  onUnlink: (eventId: number) => void;
  onOpenLinker: () => void;
  onOpenDelete: () => void;
}) {
  const profile = useUserProfile();
  const isGroupMember = profile ? profile.groups.some((g) => g.id === campaign.groupId) : true;
  const sortedEvents = [...(campaign.events ?? [])].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="flex flex-col gap-8">
      <CampaignMeta campaign={campaign} />

      {isManager ? (
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

      {!isGroupMember ? (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>{`Vous n'êtes pas membre du groupe ${campaign.group.name}`}</AlertTitle>
          <AlertDescription>
            Vous ne pouvez pas répondre aux évènements de cette campagne.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4">
        <h3 className="text-2xl">Évènements liés</h3>
        <LinkedEventsSection
          events={sortedEvents}
          isManager={isManager}
          campaignId={campaignId}
          unlinkPendingEventId={unlinkPendingEventId}
          onUnlink={onUnlink}
          onOpenLinker={onOpenLinker}
        />
      </div>
    </div>
  );
}

function useCampaignActions(campaignId: number, onDeleted: () => void) {
  const { campaignsApi } = useApiClient();

  const remove = useMutation({
    mutationFn: async () => {
      await campaignsApi.deleteCampaignApiV1CampaignsCampaignIdDelete({ campaignId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.add({ title: 'Campagne supprimée', type: 'success' });
      onDeleted();
    },
    onError: () => toast.add({ title: 'Erreur lors de la suppression de la campagne', type: 'error' }),
  });

  const publish = useMutation({
    mutationFn: async () => {
      await campaignsApi.publishCampaignApiV1CampaignsCampaignIdPublishPost({ campaignId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.add({ title: 'Campagne publiée', type: 'success' });
    },
    onError: () => toast.add({ title: 'Erreur lors de la publication de la campagne', type: 'error' }),
  });

  const archive = useMutation({
    mutationFn: async () => {
      await campaignsApi.archiveCampaignApiV1CampaignsCampaignIdArchivePost({ campaignId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.add({ title: 'Campagne archivée', type: 'success' });
    },
    onError: () => toast.add({ title: "Erreur lors de l'archivage de la campagne", type: 'error' }),
  });

  const unlink = useMutation({
    mutationFn: async (eventId: number) => {
      await campaignsApi.unlinkEventApiV1CampaignsCampaignIdEventsEventIdDelete({ campaignId, eventId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.add({ title: 'Évènement détaché de la campagne', type: 'success' });
    },
    onError: () => toast.add({ title: "Erreur lors du détachement de l'évènement", type: 'error' }),
  });

  return {
    remove, publish, archive, unlink,
  };
}

type CampaignActions = ReturnType<typeof useCampaignActions>;

function CampaignBody({
  campaign, isPending, campaignId, isManager, actions, onOpenLinker, onOpenDelete,
}: {
  campaign: Campaign | undefined;
  isPending: boolean;
  campaignId: number;
  isManager: boolean;
  actions: CampaignActions;
  onOpenLinker: () => void;
  onOpenDelete: () => void;
}) {
  if (isPending) {
    return (
      <div className="flex justify-center py-12" role="status" aria-label="Chargement de la campagne">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (!campaign) {
    return null;
  }
  return (
    <CampaignContent
      campaign={campaign}
      campaignId={campaignId}
      isManager={isManager}
      publishPending={actions.publish.isPending}
      archivePending={actions.archive.isPending}
      unlinkPendingEventId={actions.unlink.isPending ? actions.unlink.variables : undefined}
      onPublish={() => actions.publish.mutate()}
      onArchive={() => actions.archive.mutate()}
      onUnlink={(eventId) => actions.unlink.mutate(eventId)}
      onOpenLinker={onOpenLinker}
      onOpenDelete={onOpenDelete}
    />
  );
}

function headerActions(campaignId: number, isManager: boolean) {
  const links = [
    <Link key="back" to="/campaigns" className={cn(buttonVariants({ variant: 'outline' }))}>
      <ArrowLeft data-icon="inline-start" />
      Retour à la liste
    </Link>,
  ];
  if (isManager) {
    links.push(
      <Link key="edit" to={`/campaigns/${campaignId}/edit`} className={cn(buttonVariants({ variant: 'outline' }))}>
        <Pencil data-icon="inline-start" />
        Modifier
      </Link>,
    );
  }
  return links;
}

function DeleteCampaignDialog({
  open, onOpenChange, campaignName, pending, onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette campagne ?</AlertDialogTitle>
          <AlertDialogDescription>
            {`La campagne « ${campaignName} » sera supprimée. Les évènements liés ne seront pas supprimés mais seront détachés de la campagne.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" pending={pending} onClick={onConfirm}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<'id'>();
  if (!id) throw new Error('Missing campaign id');
  const campaignId = Number(id);

  const navigate = useNavigate();
  const { campaignsApi } = useApiClient();
  const { can } = usePermissions();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkerOpen, setLinkerOpen] = useState(false);

  const { data: campaign, isPending } = useQuery<Campaign>({
    queryKey: ['campaigns', campaignId],
    queryFn: async () => await campaignsApi.getCampaignApiV1CampaignsCampaignIdGet({ campaignId }),
  });

  const actions = useCampaignActions(campaignId, () => { void navigate('/campaigns'); });
  const isManager = can('edit', 'campaign');

  return (
    <>
      <Header
        title={campaign?.name ?? 'Campagne'}
        actions={headerActions(campaignId, isManager)}
        breadcrumb={[
          { title: 'Campagnes', link: '/campaigns' },
          { title: campaign?.name ?? '...' },
        ]}
      />
      <Container>
        <CampaignBody
          campaign={campaign}
          isPending={isPending}
          campaignId={campaignId}
          isManager={isManager}
          actions={actions}
          onOpenLinker={() => setLinkerOpen(true)}
          onOpenDelete={() => setDeleteOpen(true)}
        />
      </Container>

      <DeleteCampaignDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        campaignName={campaign?.name ?? ''}
        pending={actions.remove.isPending}
        onConfirm={() => actions.remove.mutate()}
      />

      <EventLinker campaignId={campaignId} open={linkerOpen} onOpenChange={setLinkerOpen} />
    </>
  );
}
