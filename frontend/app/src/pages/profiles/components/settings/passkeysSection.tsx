import { KeyRound, Plus, RefreshCw, Trash2, type LucideIcon } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Passkey } from 'bagad-client';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { UAParser } from 'ua-parser-js';
import passkeyBitwarden from '../../../../assets/passkeys/blue-shield.svg';
import passkeyBlack from '../../../../assets/passkeys/FIDO_Passkey_mark_A_black.svg';
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
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { toast } from '@/components/ui/toast';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { queryClient, useApiClient } from '../../../../config/client';
import { useRegisterPasskey } from '../../../../utils/usePasskey';

const aaguidMapping: Partial<Record<string, { icon: LucideIcon | string, name: string }>> = {
  'fbfc3007-154e-4ecc-8c0b-6e020557d7bd': { icon: KeyRound, name: 'iCloud Keychain' },
  'd548826e-79b4-db40-a3d8-11116f7e8349': { icon: passkeyBitwarden, name: 'Bitwarden' },
  'adce0002-35bc-c60a-648b-0b25f1f05503': { icon: KeyRound, name: 'Chrome on Mac' },
  'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': { icon: KeyRound, name: 'Google Password Manager' },
};

function AuthenticatorIcon({ aaguid }: { aaguid: string }) {
  const icon = aaguidMapping[aaguid]?.icon;
  if (!icon) {
    return <img src={passkeyBlack} alt="Passkey" className="size-6" />;
  }
  if (typeof icon === 'string') {
    return <img src={icon} alt="Passkey" className="size-6" />;
  }
  const Icon = icon;
  return <Icon className="size-6" aria-hidden="true" />;
}

function PasskeyItem({ passkey, onDelete }: { passkey: Passkey, onDelete: () => void }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { browser, os } = UAParser(passkey.lastUseUa ?? '');

  return (
    <Item variant="muted" className="items-start" data-credential-id={passkey.credentialId}>
      <ItemMedia>
        <AuthenticatorIcon aaguid={passkey.aaguid} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {aaguidMapping[passkey.aaguid]?.name ?? 'Passkey'}
          {passkey.backUp ? (
            <Badge variant="secondary">
              <RefreshCw data-icon="inline-start" />
              Sync
            </Badge>
          ) : null}
        </ItemTitle>
        <ItemDescription>
          Ajoutée
          {' '}
          <span title={passkey.createdAt.toLocaleString()}>
            {DateTime.fromJSDate(passkey.createdAt).toRelative()}
          </span>
        </ItemDescription>
        <ItemDescription>
          <span className="font-semibold text-foreground">Dernière utilisation : </span>
          {passkey.lastUseAt ? (
            <>
              <span title={passkey.lastUseAt.toLocaleString()}>
                {DateTime.fromJSDate(passkey.lastUseAt).toRelative()}
              </span>
              {` sur ${browser.name}, ${os.name}`}
            </>
          ) : 'jamais'}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
            <Trash2 data-icon="inline-start" />
            Supprimer
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette passkey ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette passkey ne pourra plus être utilisée pour vous connecter.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  onDelete();
                  setIsDeleteDialogOpen(false);
                }}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ItemActions>
    </Item>
  );
}

/**
 * "Passkeys" section: list, register and delete the current user's passkeys.
 */
export default function PasskeysSection() {
  const { authApi } = useApiClient();

  const { data } = useQuery({
    queryKey: ['passkeys'],
    queryFn: async () => await authApi.listPasskeysApiV1WebauthnGet(),
  });

  const register = useRegisterPasskey();

  const { mutate: deleteMutation } = useMutation({
    mutationFn: async (cid: string) => await authApi.deletePasskeyApiV1WebauthnCredentialIdDelete({
      credentialId: cid,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Connectez-vous sans mot de passe avec vos appareils.
        </CardDescription>
        <CardAction>
          <Button
            size="sm"
            onClick={() => register.mutate(undefined, {
              onSuccess: (result) => {
                toast.add(
                  result.status === 'already-registered'
                    ? {
                        title: 'Cet appareil possède déjà une passkey pour votre compte.',
                        type: 'info',
                      }
                    : { title: 'Passkey ajoutée !', type: 'success' },
                );
              },
              onError: () => {
                toast.add({ title: "Impossible d'ajouter la passkey.", type: 'error' });
              },
            })}
            disabled={register.isPending}
          >
            <Plus data-icon="inline-start" />
            Ajouter
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {data && data.length > 0 ? (
          data.map((e) => (
            <PasskeyItem
              passkey={e}
              key={e.credentialId}
              onDelete={() => deleteMutation(e.credentialId)}
            />
          ))
        ) : (
          <Empty>
            <EmptyMedia variant="icon">
              <KeyRound aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Aucune passkey</EmptyTitle>
            <EmptyDescription>
              Ajoutez une passkey pour vous connecter plus rapidement et en toute sécurité.
            </EmptyDescription>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
