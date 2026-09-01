import { KeyRound, RefreshCw, Trash2, type LucideIcon } from 'lucide-react';
import {
  type PublicKeyCredentialCreationOptionsJSON, startRegistration, WebAuthnError,
} from '@simplewebauthn/browser';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Passkey } from 'bagad-client';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { UAParser } from 'ua-parser-js';
import passkeyBitwarden from '../../assets/passkeys/blue-shield.svg';
import passkeyBlack from '../../assets/passkeys/FIDO_Passkey_mark_A_black.svg';
import Container from '../../components/container';
import Header from '../../components/header';
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
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { queryClient, useApiClient, useUserProfile } from '../../config/client';

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
    <Item variant="muted" className="mb-4 items-start">
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
export default function PasskeysPage() {
  const profile = useUserProfile();
  const { authApi } = useApiClient();

  const { data } = useQuery({
    queryKey: ['passkeys'],
    queryFn: async () => await authApi.listPasskeysApiV1WebauthnGet(),
    enabled: !!profile,
  });

  const register = async () => {

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- The API response type is not narrowed to PublicKeyCredentialCreationOptionsJSON
    const registrationOpt = await authApi.preregisterPasskeyApiV1WebauthnPreregisterGet() as PublicKeyCredentialCreationOptionsJSON;

    try {
      // Pass the options to the authenticator and wait for a response
      const attResp = await startRegistration({ optionsJSON: registrationOpt });
      await authApi.registerPasskeyApiV1WebauthnRegisterPost({ requestBody: attResp });
      await queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    } catch (error) {
      // Some basic error handling
      if (error instanceof WebAuthnError && error.name === 'InvalidStateError') {

        console.error('Error: Authenticator was probably already registered by user');
      } else {

        console.error(error);
      }

      throw error;
    }
  };

  const { mutate: deleteMutation } = useMutation({
    mutationFn: async (cid: string) => await authApi.deletePasskeyApiV1WebauthnCredentialIdDelete({
      credentialId: cid,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    },
  });

  if (!profile) {
    return null;
  }

  return (
    <>
      <Header
        title="Profil"
        subtitle={`${profile.firstName} ${profile.lastName}`}
        actions={[
          <Button key="add-passkey" onClick={register}>
            <KeyRound data-icon="inline-start" />
            Ajouter
          </Button>,
        ]}
        breadcrumb={[
          { title: 'Profils', link: '/profile' },
          { title: 'Mon profil' },
        ]}
      />

      <Container>
        {data?.map((e) => (
          <PasskeyItem
            passkey={e}
            key={e.credentialId}
            onDelete={() => deleteMutation(e.credentialId)}
          />
        ))}
      </Container>
    </>
  );
}
