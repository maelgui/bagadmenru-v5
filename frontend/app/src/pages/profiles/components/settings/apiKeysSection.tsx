import { Copy, KeyRound, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ApiKey, ApiKeyCreated } from 'bagad-client';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { toast } from '@/components/ui/toast';
import { queryClient, useApiClient } from '../../../../config/client';

/**
 * Human-friendly (fr) labels for the RBAC permissions a key can carry. Keys are
 * "action:resource" strings as returned by the backend; unknown ones fall back
 * to the raw string so a newly added permission still renders.
 */
const PERMISSION_LABELS: Record<string, string> = {
  'view:calendar': 'Synchroniser le calendrier (ICS)',
  'view:event': 'Voir les évènements',
  'view:profile': 'Voir les profils des membres',
  'view:file': 'Voir les fichiers',
  'view:group': 'Voir les groupes',
};

function permissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission] ?? permission;
}

/**
 * Dialog shown once, right after a key is created, to reveal the raw secret.
 * The backend only stores a hash, so this is the single opportunity to copy
 * the key -- hence the explicit "you won't see it again" warning.
 */
function RevealKeyDialog({
  created,
  onClose,
}: {
  created: ApiKeyCreated | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={created !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clé d&apos;API créée</DialogTitle>
          <DialogDescription>
            Copiez cette clé maintenant : pour des raisons de sécurité, elle ne sera plus
            jamais affichée.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Alert variant="destructive" className="mb-4">
            <TriangleAlert />
            <AlertTitle>Copiez-la avant de fermer</AlertTitle>
            <AlertDescription>
              Nous ne stockons qu&apos;une empreinte de la clé, impossible de la retrouver
              ensuite.
            </AlertDescription>
          </Alert>
          <code className="block w-full overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs break-all">
            {created?.key}
          </code>
        </DialogBody>
        <DialogFooter>
          {created ? (
            <CopyButton value={created.key} label="Copier la clé" icon={Copy} />
          ) : null}
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Dialog to name a new key and pick which permissions it may exercise. */
function CreateKeyDialog({
  open,
  onOpenChange,
  permissions,
  isPending,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: string[];
  isPending: boolean;
  onCreate: (label: string, perms: string[]) => void;
}) {
  const [label, setLabel] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const permsAnchor = useComboboxAnchor();

  const reset = () => {
    setLabel('');
    setSelected([]);
  };

  const canSubmit = label.trim().length > 0 && selected.length > 0 && !isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle clé d&apos;API</DialogTitle>
          <DialogDescription>
            Une clé authentifie votre compte pour les applications externes. Elle ne peut
            faire que ce que vous choisissez ci-dessous, et jamais plus que ce que vous
            pouvez faire vous-même.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key-label">Nom</Label>
            <Input
              id="api-key-label"
              placeholder="Ex : Calendrier iPhone"
              value={label}
              maxLength={64}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key-perms">Autorisations</Label>
            <Combobox
              multiple
              value={selected}
              onValueChange={(next) => setSelected(Array.isArray(next) ? next : [])}
            >
              <ComboboxChips ref={permsAnchor}>
                <ComboboxValue>
                  {(values: string[]) => (
                    <>
                      {values.map((perm) => (
                        <ComboboxChip key={perm} aria-label={permissionLabel(perm)}>
                          {permissionLabel(perm)}
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput
                        id="api-key-perms"
                        placeholder={values.length ? '' : 'Choisissez ce que la clé peut faire'}
                      />
                    </>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={permsAnchor}>
                <ComboboxList>
                  {permissions.map((perm) => (
                    <ComboboxItem key={perm} value={perm}>
                      {permissionLabel(perm)}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
                <ComboboxEmpty>Aucune autorisation disponible.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            disabled={!canSubmit}
            onClick={() => onCreate(label.trim(), selected)}
          >
            Créer la clé
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApiKeyItem({
  apiKey,
  onRevoke,
}: {
  apiKey: ApiKey;
  onRevoke: () => void;
}) {
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);

  return (
    <Item variant="muted" className="items-start" data-key-hash={apiKey.keyHash}>
      <ItemMedia>
        <KeyRound className="size-5" aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {apiKey.label}
          <Badge variant="secondary" className="font-mono">{apiKey.prefix}…</Badge>
        </ItemTitle>
        <ItemDescription className="flex flex-wrap gap-1">
          {apiKey.authorizedPermissions.map((perm) => (
            <Badge key={perm} variant="outline">{permissionLabel(perm)}</Badge>
          ))}
        </ItemDescription>
        <ItemDescription>
          <span className="font-semibold text-foreground">Dernière utilisation : </span>
          {apiKey.lastUsedAt ? (
            <span title={apiKey.lastUsedAt.toLocaleString()}>
              {DateTime.fromJSDate(apiKey.lastUsedAt).toRelative()}
            </span>
          ) : 'jamais'}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
          <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
            <Trash2 data-icon="inline-start" />
            Révoquer
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Révoquer cette clé ?</AlertDialogTitle>
              <AlertDialogDescription>
                Les applications qui l&apos;utilisent cesseront immédiatement de fonctionner.
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  onRevoke();
                  setIsRevokeDialogOpen(false);
                }}
              >
                Révoquer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ItemActions>
    </Item>
  );
}

/**
 * "Clés d'API" section: list, create (revealing the secret once) and revoke the
 * current member's API keys. Each key carries a subset of the member's own
 * permissions.
 */
export default function ApiKeysSection() {
  const { usersApi } = useApiClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);

  const { data: keys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => await usersApi.listMyApiKeysApiV1ProfilesMeApiKeysGet(),
  });

  const { data: permissions } = useQuery({
    queryKey: ['me', 'permissions'],
    queryFn: async () =>
      await usersApi.getMyPermissionsApiV1ProfilesMePermissionsGet(),
  });

  const { mutate: createMutation, isPending: isCreating } = useMutation({
    mutationFn: async ({ label, perms }: { label: string; perms: string[] }) =>
      await usersApi.createMyApiKeyApiV1ProfilesMeApiKeysPost({
        apiKeyCreate: { label, authorizedPermissions: perms },
      }),
    onSuccess: async (created) => {
      setIsCreateOpen(false);
      setCreatedKey(created);
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: () => {
      toast.add({ title: 'La création de la clé a échoué.', type: 'error' });
    },
  });

  const { mutate: revokeMutation } = useMutation({
    mutationFn: async (keyHash: string) =>
      await usersApi.revokeMyApiKeyApiV1ProfilesMeApiKeysKeyHashDelete({ keyHash }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clés d&apos;API</CardTitle>
        <CardDescription>
          Permettez à des applications externes d&apos;accéder à certaines données en votre
          nom, sans partager votre mot de passe.
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} disabled={!permissions}>
            <Plus data-icon="inline-start" />
            Créer une clé
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {keys && keys.length > 0 ? (
          keys.map((k) => (
            <ApiKeyItem
              key={k.keyHash}
              apiKey={k}
              onRevoke={() => revokeMutation(k.keyHash)}
            />
          ))
        ) : (
          <Empty>
            <EmptyMedia variant="icon">
              <KeyRound aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Aucune clé d&apos;API</EmptyTitle>
            <EmptyDescription>
              Créez une clé pour connecter une application externe, par exemple pour
              synchroniser le calendrier avec authentification.
            </EmptyDescription>
          </Empty>
        )}
      </CardContent>

      <CreateKeyDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        permissions={(permissions ?? []).filter((p): p is string => p !== null)}
        isPending={isCreating}
        onCreate={(label, perms) => createMutation({ label, perms })}
      />
      <RevealKeyDialog created={createdKey} onClose={() => setCreatedKey(null)} />
    </Card>
  );
}
