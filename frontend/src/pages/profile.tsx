import { useOidcIdToken } from '@axa-fr/react-oidc';
import { useEffect, useState } from 'react';
import { Profile, UsersService } from '../client';

export default function MyProfile() {
  const { idTokenPayload } = useOidcIdToken();
  const [profile, setProfile] = useState<Profile>();
  useEffect(() => {
    UsersService.getMyProfileApiV1ProfilesMeGet().then((data) => setProfile(data));
  }, []);

  if (!profile) {
    return null;
  }

  return (
    <>
      <div className="text-center">
        <img className="inline rounded-full" src={profile.picture} alt="profile" />
        <h1 className="text-4xl">{profile.name}</h1>
      </div>
      <pre>{JSON.stringify(idTokenPayload, null, 2)}</pre>
      <span>{profile?.name}</span>
    </>
  );
}
