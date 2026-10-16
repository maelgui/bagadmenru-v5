import { useMutation, useQuery } from '@tanstack/react-query';
import type { Group, MailingListPreview } from 'bagad-client';
import {
  CheckCircle2, CircleAlert, Mail, Minus, Plus, RefreshCw, TriangleAlert,
} from 'lucide-react';
import {
  Alert, AlertDescription, AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { queryClient, useApiClient, usePermissions } from '../../../config/client';

function formatDate(value?: Date | null) {
  if (!value) return 'jamais';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function StatusBadge({ preview, syncError }: {
  preview?: MailingListPreview
  syncError?: string | null
}) {
  if (syncError) {
    return (
      <Badge className="bg-destructive/15 text-destructive">
        <TriangleAlert data-icon="inline-start" />
        En erreur
      </Badge>
    );
  }
  if (preview && !preview.configured) {
    return (
      <Badge className="bg-muted text-muted-foreground">
        <CircleAlert data-icon="inline-start" />
        OVH non configuré
      </Badge>
    );
  }
  if (preview?.inSync) {
    return (
      <Badge className="bg-success/15 text-success">
        <CheckCircle2 data-icon="inline-start" />
        Synchronisée
      </Badge>
    );
  }
  if (preview && !preview.inSync) {
    return (
      <Badge className="bg-destructive/15 text-destructive">
        <CircleAlert data-icon="inline-start" />
        Désynchronisée
      </Badge>
    );
  }
  return null;
}

function DiffPill({ email, tone }: { email: string, tone: 'add' | 'remove' }) {
  const badgeClass = tone === 'add'
    ? 'bg-success/15 text-success'
    : 'bg-destructive/15 text-destructive';
  const Icon = tone === 'add' ? Plus : Minus;
  const label = tone === 'add' ? 'À ajouter' : 'À retirer';
  return (
    <li>
      <Badge className={badgeClass}>
        <Icon data-icon="inline-start" aria-label={label} />
        {email}
      </Badge>
    </li>
  );
}

function pluralSuffix(n: number) {
  return n > 1 ? 's' : '';
}

function PreviewBody({ status, preview }: {
  status: 'pending' | 'error' | 'success'
  preview?: MailingListPreview
}) {
  if (status === 'pending') {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Chargement des abonnés…
      </p>
    );
  }

  if (status === 'error' || !preview) {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Aperçu indisponible</AlertTitle>
        <AlertDescription>
          Impossible de récupérer les abonnés de la mailing liste.
        </AlertDescription>
      </Alert>
    );
  }

  if (!preview.configured) {
    const n = preview.expected.length;
    return (
      <p className="text-sm text-muted-foreground">
        Les identifiants OVH ne sont pas configurés&nbsp;: l&apos;aperçu des
        abonnés et la synchronisation sont indisponibles. {n}{' '}
        membre{pluralSuffix(n)} devrai{n > 1 ? 'ent' : 't'} être
        abonné{pluralSuffix(n)}.
      </p>
    );
  }

  if (preview.inSync) {
    return (
      <p className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 className="size-4" />
        La mailing liste est à jour ({preview.subscribers.length} abonné{pluralSuffix(preview.subscribers.length)}).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {preview.toAdd.length} à ajouter · {preview.toRemove.length} à retirer
      </p>
      <ul className="flex flex-wrap gap-2">
        {preview.toAdd.map((email) => (
          <DiffPill key={email} email={email} tone="add" />
        ))}
        {preview.toRemove.map((email) => (
          <DiffPill key={email} email={email} tone="remove" />
        ))}
      </ul>
    </div>
  );
}

export default function MailingListSection({ group }: { group: Group }) {
  const { usersApi } = useApiClient();
  const { can } = usePermissions();
  const canSync = can('edit', 'group');

  const previewQueryKey = ['groups', group.id, 'mailing-list', 'preview'];

  const { data: preview, status, refetch } = useQuery<MailingListPreview>({
    queryKey: previewQueryKey,
    queryFn: async () => await usersApi
      .previewMailingListApiV1GroupsGroupIdMailingListPreviewGet({ groupId: group.id }),
  });

  const { mutate: sync, isPending: isSyncing } = useMutation({
    mutationFn: async () => await usersApi
      .syncMailingListApiV1GroupsGroupIdMailingListSyncPost({ groupId: group.id }),
    onSuccess: async (result) => {
      queryClient.setQueryData(previewQueryKey, result);
      await queryClient.invalidateQueries({ queryKey: ['groups', group.id] });
      toast.add({
        title: result.inSync
          ? 'Mailing liste synchronisée.'
          : 'Synchronisation lancée.',
        type: 'success',
      });
    },
    onError: () => {
      toast.add({ title: 'La synchronisation a échoué.', type: 'error' });
      void refetch();
    },
  });

  return (
    <section className="mb-12">
      <h3 className="mb-4 text-2xl">Mailing liste</h3>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
            {group.mailingList}@bagadmenru.bzh
            <StatusBadge preview={preview} syncError={group.mailingListSyncError} />
          </CardTitle>
          <CardDescription>
            Dernière synchro&nbsp;: {formatDate(group.mailingListSyncedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {group.mailingListSyncError ? (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Dernière synchronisation en échec</AlertTitle>
              <AlertDescription>{group.mailingListSyncError}</AlertDescription>
            </Alert>
          ) : null}
          <PreviewBody status={status} preview={preview} />
          {canSync ? (
            <Button
              type="button"
              disabled={isSyncing}
              onClick={() => sync()}
              className="self-stretch bg-primary/15 text-primary shadow-none hover:bg-primary/25 sm:self-start"
            >
              {isSyncing ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
              Synchroniser maintenant
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
