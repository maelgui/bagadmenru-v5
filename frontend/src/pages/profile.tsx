import { useOidcIdToken } from '@axa-fr/react-oidc';
import { useLoaderData } from 'react-router-dom';
import { Profile } from '../client';

export default function MyProfile() {
  const { idTokenPayload } = useOidcIdToken();
  const profile = useLoaderData() as Profile;

  return (
    <>
      <pre>{JSON.stringify(idTokenPayload, null, 2)}</pre>
      <span>{profile?.name}</span>
    </>
  );
}
