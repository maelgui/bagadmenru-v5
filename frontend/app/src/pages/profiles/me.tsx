import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/avatar';
import Badge from '../../components/badge';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';

export default function MyProfile() {
  const { usersApi } = useApiClient();

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
          <div className="text-center">
            <div className="inline-block m-auto">
              <Avatar src={profile.pictureUrl} size="lg" className="m-8" />
            </div>
            <h1 className="text-4xl">{`${profile.firstName} ${profile.lastName}`}</h1>
            <ul className="mt-8">
              <Badge className="m-2" style={{ backgroundColor: profile.instrument.color }}>{profile.instrument.name}</Badge>
              {profile.groups?.map((g) => <Badge key={g.id} className="bg-pourpre-500 m-2">{g.name}</Badge>)}
            </ul>
          </div>
        ) : 'Loading'}
      </Container>
    </>
  );
}
