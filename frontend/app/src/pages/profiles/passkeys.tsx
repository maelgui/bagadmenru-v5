import { faApple, faChrome, faGoogle } from '@fortawesome/free-brands-svg-icons';
import {
  faArrowsRotate,
  faTrash, type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  type PublicKeyCredentialCreationOptionsJSON, startRegistration, WebAuthnError,
} from '@simplewebauthn/browser';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Passkey } from 'bagad-client';
import { DateTime } from 'luxon';
import { UAParser } from 'ua-parser-js';
import passkeyBitwarden from '../../assets/passkeys/blue-shield.svg';
import passkeyBlack from '../../assets/passkeys/FIDO_Passkey_mark_A_black.svg';
import Badge from '../../components/badge';
import Button from '../../components/button';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient, useUserProfile } from '../../config/client';

const aaguidMapping: Partial<Record<string, { icon: IconDefinition | string, name: string }>> = {
  'fbfc3007-154e-4ecc-8c0b-6e020557d7bd': { icon: faApple, name: 'iCloud Keychain' },
  'd548826e-79b4-db40-a3d8-11116f7e8349': { icon: passkeyBitwarden, name: 'Bitwarden' },
  'adce0002-35bc-c60a-648b-0b25f1f05503': { icon: faChrome, name: 'Chrome on Mac' },
  'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': { icon: faGoogle, name: 'Google Password Manager' },
};

function AuthenticatorIcon({ aaguid }: { aaguid: string }) {
  const icon = aaguidMapping[aaguid]?.icon;
  if (!icon) {
    return <img src={passkeyBlack} alt="passkey" className="w-6 h-6" />;
  }
  if (typeof icon === 'string') {
    return <img src={icon} alt="passkey" className="w-6 h-6" />;
  }
  return <FontAwesomeIcon icon={icon} className="w-6 h-6" />;
}

function PasskeyItem({ passkey, onDelete }: { passkey: Passkey, onDelete: () => void }) {
  const { browser, os } = UAParser(passkey.lastUseUa ?? '');

  return (
    <div className="md:flex items-center justify-between bg-gray-100 px-8 py-6 mb-8 rounded-lg">
      <div>
        <div className="flex items-center">
          <div className="mr-4">
            <AuthenticatorIcon aaguid={passkey.aaguid} />
          </div>
          <div>
            <span className="font-semibold">{aaguidMapping[passkey.aaguid]?.name ?? 'Passkey'}</span>
          </div>
          {passkey.backUp ? (
            <Badge className="text-xs mx-4 bg-sky-200 !text-sky-600">
              <FontAwesomeIcon icon={faArrowsRotate} className="pr-1" />
              Sync
            </Badge>
          ) : null}
        </div>
        <div className="text-gray-500">
          Ajoutée
          {' '}
          <span title={passkey.createdAt.toLocaleString()}>
            {DateTime.fromJSDate(passkey.createdAt).toRelative()}
          </span>
        </div>
        <div className="text-sm mt-4">
          <div className="font-semibold">Dernière utilisation</div>
          <div className="text-gray-500">
            {passkey.lastUseAt ? (
              <>
                <span title={passkey.lastUseAt.toLocaleString()}>
                  {DateTime.fromJSDate(passkey.lastUseAt).toRelative()}
                </span>
                {` sur ${browser.name}, ${os.name}`}
              </>
            )
              : 'jamais'}
          </div>
        </div>
      </div>
      <div className="pt-4 md:p-0">
        <Button variant="ghost" icon={faTrash} size="sm" onClick={onDelete}>Supprimer</Button>
      </div>
    </div>
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
          <Header.Action key="add-passkey" onClick={register}>Ajouter</Header.Action>,
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
