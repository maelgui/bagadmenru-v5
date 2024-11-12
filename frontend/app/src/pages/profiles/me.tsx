import { faKey } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../../components/avatar';
import Badge from '../../components/badge';
import Container from '../../components/container';
import Header from '../../components/header';
import { useUserProfile } from '../../config/client';
import env from '../../env';

export default function ShowMyProfilePage() {
  const navigate = useNavigate();
  const profile = useUserProfile();

  if (!profile) {
    return null;
  }

  return (
    <>
      <Header
        title="Profil"
        subtitle={`${profile.firstName} ${profile.lastName}`}
        actions={[
          <Header.Action as="a" key="manage-authenticator" variant="outline" href={`${env.VITE_OIDC_PROVIDER_URL.replace(/\/$/, '')}/webauthn/list`}>
            <FontAwesomeIcon icon={faKey} />
          </Header.Action>,
          <Header.Action key="edit-profile" onClick={() => navigate('/profile/edit/me')}>Modifier mon profil</Header.Action>,
        ]}
        breadcrumb={[
          { title: 'Profils', link: '/profile' },
          { title: 'Mon profil' },
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
