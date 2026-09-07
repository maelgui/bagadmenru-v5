import { KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Passkey } from 'bagad-client';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { UAParser } from 'ua-parser-js';
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
import { useTheme } from '../../../../config/theme';
import { resolveAuthenticator } from '../../../../utils/authenticators';
import { useRegisterPasskey } from '../../../../utils/usePasskey';

/**
 * Provider brand icon for a passkey, resolved from its AAGUID via the official
 * community mapping. Falls back to the generic FIDO passkey mark for unknown
 * authenticators. Honors the active light/dark theme.
 */
function AuthenticatorIcon({ aaguid }: { aaguid: string }) {
  const { resolvedTheme } = useTheme();
  const { icon } = resolveAuthenticator(aaguid, resolvedTheme);
  return <img src={icon ?? passkeyBlack} alt="" className="size-6" />;
}

function PasskeyItem({ passkey, onDelete }: { passkey: Passkey, onDelete: () => void }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const { browser, os } = UAParser(passkey.lastUseUa ?? '');
  const authenticatorName = resolveAuthenticator(passkey.aaguid, resolvedTheme).name ?? 'Passkey';

  return (
    <Item variant="muted" className="items-start" data-credential-id={passkey.credentialId}>
      <ItemMedia>
        <AuthenticatorIcon aaguid={passkey.aaguid} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {authenticatorName}
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
                // The browser deliberately collapses several causes into a single
                // NotAllowedError (user cancelled, timed out, or — notably on
                // Firefox — the device already has a passkey but the browser
                // won't disclose it, unlike Chrome which raises InvalidStateError,
                // surfaced above as `already-registered`). We therefore cannot
                // name the cause without lying or leaking, per the WebAuthn spec's
                // privacy design (W3C WebAuthn §6.3.2 / §14.5.1). Show a neutral,
                // action-first, non-alarming message instead — as recommended by
                // FIDO Alliance and NN/g error-message guidelines.
                toast.add({
                  title: "L'ajout de la passkey n'a pas abouti. Vous en avez peut-être déjà une sur cet appareil — réessayez, ou configurez-la plus tard.",
                  type: 'info',
                });
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
