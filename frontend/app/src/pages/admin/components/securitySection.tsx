import { useMutation } from '@tanstack/react-query';
import type { AdminApiKey, AdminMember } from 'bagad-client';
import { FingerprintIcon, KeyRoundIcon, LockIcon, ShieldAlertIcon, Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { permissionLabel } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { queryClient, useApiClient } from '../../../config/client';
import { hasCredential } from '../memberUtils';
import { useAdminApiKeys, useAdminMembers } from '../queries';

const PERCENT = 100;

function AdoptionStat({
  icon: Icon,
  value,
  total,
  label,
  tone,
}: {
  icon: typeof LockIcon;
  value: number;
  total: number;
  label: string;
  tone?: 'warning';
}) {
  const percent = total ? Math.round((value / total) * PERCENT) : null;
  return (
    <div className={cn('flex items-start gap-3 rounded-3xl p-4', tone === 'warning' ? 'bg-destructive/10 text-destructive' : 'bg-muted')}>
      <Icon className="mt-1 size-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-2xl font-semibold tabular-nums">
          {value}
          {percent !== null ? <span className="ml-2 text-sm font-normal">{percent} %</span> : null}
        </p>
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}

function RevokeButton({ apiKey, onRevoke }: { apiKey: AdminApiKey; onRevoke: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" aria-label={`Révoquer la clé ${apiKey.label}`} />}>
        <Trash2 data-icon="inline-start" />
        Révoquer
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Révoquer cette clé ?</AlertDialogTitle>
          <AlertDialogDescription>
            La clé « {apiKey.label} » de {apiKey.owner.firstName} {apiKey.owner.lastName} cessera
            immédiatement de fonctionner. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onRevoke();
              setOpen(false);
            }}
          >
            Révoquer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ApiKeysCard() {
  const { adminApi } = useApiClient();
  const { data: keys } = useAdminApiKeys();

  const revoke = useMutation({
    mutationFn: async (keyHash: string) => await adminApi.revokeApiKeyApiV1AdminApiKeysKeyHashDelete({ keyHash }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.add({ title: 'Clé révoquée.', type: 'success' });
    },
    onError: () => toast.add({ title: 'La révocation a échoué.', type: 'error' }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clés d&apos;API</CardTitle>
        <CardDescription>
          Toutes les clés actives, tous membres confondus. Une clé ne peut jamais faire plus que
          son propriétaire.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!keys ? <Skeleton className="h-32 w-full" /> : null}
        {keys?.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><KeyRoundIcon /></EmptyMedia>
              <EmptyTitle>Aucune clé active</EmptyTitle>
              <EmptyDescription>Aucun membre n&apos;a de clé d&apos;API en cours de validité.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {keys && keys.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Clé</TableHead>
                <TableHead>Autorisations</TableHead>
                <TableHead>Dernière utilisation</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.keyHash} data-key-hash={key.keyHash}>
                  <TableCell>
                    <Link to={`/profile/${key.owner.id}`} className="font-medium hover:underline">
                      {key.owner.firstName} {key.owner.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-col gap-1">
                      <span>{key.label}</span>
                      <span className="flex gap-1">
                        <Badge variant="secondary" className="font-mono">{key.prefix}…</Badge>
                        {key.autoGenerated ? <Badge variant="outline">Auto</Badge> : null}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      {key.authorizedPermissions.map((perm) => (
                        <Badge key={perm} variant="outline">{permissionLabel(perm)}</Badge>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.lastUsedAt ? (
                      <span title={key.lastUsedAt.toLocaleString()}>
                        {DateTime.fromJSDate(key.lastUsedAt).toRelative()}
                      </span>
                    ) : 'jamais'}
                  </TableCell>
                  <TableCell className="text-right">
                    <RevokeButton apiKey={key} onRevoke={() => revoke.mutate(key.keyHash)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AdoptionCard({ members }: { members: AdminMember[] }) {
  const withoutCredential = members.filter((m) => !hasCredential(m));
  const total = members.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Moyens de connexion</CardTitle>
        <CardDescription>Adoption des passkeys et des mots de passe parmi les membres actifs.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AdoptionStat
            icon={FingerprintIcon}
            value={members.filter((m) => m.passkeyCount > 0).length}
            total={total}
            label="avec au moins une passkey"
          />
          <AdoptionStat
            icon={LockIcon}
            value={members.filter((m) => m.hasPassword && m.passkeyCount === 0).length}
            total={total}
            label="mot de passe uniquement"
          />
          <AdoptionStat
            icon={ShieldAlertIcon}
            value={withoutCredential.length}
            total={total}
            label="sans identifiant (lien e-mail seulement)"
            tone={withoutCredential.length > 0 ? 'warning' : undefined}
          />
        </div>
        {withoutCredential.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {withoutCredential.map((m) => (
              <li key={m.id}>
                <Link to={`/profile/${m.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                  {m.firstName} {m.lastName}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function SecuritySection() {
  const { data: members } = useAdminMembers();

  return (
    <div className="flex flex-col gap-6">
      {members ? <AdoptionCard members={members.filter((m) => m.isActive)} /> : <Skeleton className="h-48 w-full" />}
      <ApiKeysCard />
    </div>
  );
}
