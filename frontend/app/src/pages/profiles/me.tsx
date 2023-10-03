import { useOidcIdToken } from '@axa-fr/react-oidc';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import defaultAvatar from '../../assets/default.svg';
import Container from '../../components/container';
import Header from '../../components/header';
import { usersApi } from '../../config/client';

export default function MyProfile() {
  const { idTokenPayload } = useOidcIdToken();
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: () => usersApi.getMyProfileApiV1ProfilesMeGet(),
  });

  if (!profile) {
    return null;
  }

  return (
    <>
      <Header
        title="Profile"
        subtitle={`${profile.firstName} ${profile.lastName}`}
        actions={[<Header.Action key="edit-profile" onClick={() => navigate('/profile/edit')}>Modifier mon profil</Header.Action>]}
        breadcrumb={[
          { title: 'Mon profile' },
        ]}
      />

      <Container>
        {profile ? (
          <>
            <div className="text-center">
              <img className="inline rounded-full bg-pourpre-50 h-64 m-8" src={profile.picture ?? defaultAvatar} alt="profile" />
              <h1 className="text-4xl">{`${profile.firstName} ${profile.lastName}`}</h1>
            </div>
            <pre>{JSON.stringify(idTokenPayload, null, 2)}</pre>
            <span>{`${profile.firstName} ${profile.lastName}`}</span>
          </>
        ) : 'Loading'}
      </Container>
    </>
  );
}
