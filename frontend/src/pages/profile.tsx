import { useOidcIdToken } from '@axa-fr/react-oidc';
import { useEffect, useState } from 'react';
import { Profile, UsersService } from '../client';

export default function MyProfile() {
  const { idTokenPayload } = useOidcIdToken();
  const [profile, setProfile] = useState<Profile>();
  useEffect(() => {
    UsersService.getMyProfileApiV1ProfilesMeGet().then((data) => setProfile(data));
  }, []);

  return (
    <>
      <pre>{JSON.stringify(idTokenPayload, null, 2)}</pre>
      <span>{profile?.name}</span>
    </>
  );
}
