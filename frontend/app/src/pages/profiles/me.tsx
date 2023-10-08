import { useOidcIdToken } from '@axa-fr/react-oidc';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/avatar';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';

export default function MyProfile() {
  const { usersApi } = useApiClient();

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
              <div className="inline-block m-auto">
                <Avatar src={profile.pictureUrl} size="lg" />
              </div>
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
