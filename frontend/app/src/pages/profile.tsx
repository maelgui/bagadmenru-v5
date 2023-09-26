import { useOidcIdToken } from '@axa-fr/react-oidc';
import { Profile } from 'bagad-client';
import { useEffect, useState } from 'react';
import Container from '../components/container';
import { usersApi } from '../config/client';
import Header from '../components/header';

export default function MyProfile() {
  const { idTokenPayload } = useOidcIdToken();
  const [profile, setProfile] = useState<Profile>();
  useEffect(() => {
    usersApi.getMyProfileApiV1ProfilesMeGet().then((data) => setProfile(data));
  }, []);

  if (!profile) {
    return null;
  }

  return (
    <>
      <Header
        title="Profile"
        subtitle={profile.name}
        actions={[<Header.Action key="edit-profile">Modifier mon profil</Header.Action>]}
        breadcrumb={[
          { title: 'Mon profile' },
        ]}
      />

      <Container>
        <div className="text-center">
          <img className="inline rounded-full" src={profile.picture} alt="profile" />
          <h1 className="text-4xl">{profile.name}</h1>
        </div>
        <pre>{JSON.stringify(idTokenPayload, null, 2)}</pre>
        <span>{profile?.name}</span>
      </Container>
    </>
  );
}
