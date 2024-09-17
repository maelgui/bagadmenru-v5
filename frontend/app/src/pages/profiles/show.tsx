import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../../components/avatar';
import Badge from '../../components/badge';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions, useUserProfile } from '../../config/client';

export default function ShowProfilePage() {
  const { usersApi } = useApiClient();
  const currentUser = useUserProfile();
  const { has } = usePermissions();
  const { profileId } = useParams<{ profileId: string }>();
  if (!profileId) {
    return null;
  }

  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ['profiles', profileId],
    queryFn: () => (profileId === 'me'
      ? usersApi.getMyProfileApiV1ProfilesMeGet()
      : usersApi.getProfileApiV1ProfilesProfileIdGet({ profileId })
    ),
  });

  if (!profile) {
    return null;
  }

  return (
    <>
      <Header
        title="Profil"
        subtitle={`${profile.firstName} ${profile.lastName}`}
        actions={has('ProfilesScopes.UPDATE') || profileId === 'me' || profileId === currentUser?.id
          ? [<Header.Action key="edit-profile" onClick={() => navigate(`/profile/edit/${profileId === currentUser?.id ? 'me' : profileId}`)}>Modifier le profil</Header.Action>]
          : []}
        breadcrumb={[
          { title: 'Profils', link: '/profile' },
          { title: `${profile.firstName} ${profile.lastName}` },
        ]}
      />

      <Container>
        {profile ? (
          <div className="text-center">
            <div className="inline-block m-auto">
              <Avatar src={profile.pictureUrl} size="lg" className="m-8" />
            </div>
            <h1 className="text-4xl">{`${profile.firstName} ${profile.lastName}`}</h1>
            <ul className="mt-8">
              {profile.instrument ? (<Badge className="m-2" style={{ backgroundColor: profile.instrument.color }}>{profile.instrument.name}</Badge>) : null}
              {profile.groups?.map((g) => <Link key={g.id} to={`/groups/${g.id}`}><Badge className="bg-pourpre-500 m-2">{g.name}</Badge></Link>)}
            </ul>
          </div>
        ) : 'Loading'}
      </Container>
    </>
  );
}
