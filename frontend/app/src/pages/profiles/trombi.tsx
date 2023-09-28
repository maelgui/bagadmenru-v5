import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { usersApi } from '../../config/client';

import defaultAvatar from '../../assets/default.svg';

export default function ProfilesPage() {
  const { data } = useQuery({ queryKey: ['profiles'], queryFn: () => usersApi.listProfilesApiV1ProfilesGet() });

  if (data === undefined) {
    return null;
  }
  return (
    <>
      <Header
        title="Liste des membres"
        subtitle="Pensez à ajouter votre photo"
        actions={[<Header.Action key="edit-profile" as={Link} to="/profile/edit">Modifier mon profil</Header.Action>]}
        breadcrumb={[
          { title: 'Liste des membres' },
        ]}
      />

      <Container>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.map((profile) => (
            <div key={profile.id}>
              <div className="rounded overflow-hidden shadow flex flex-col">
                {profile.picture
                  ? <img src={profile.picture} alt="profile" />
                  : <img src={defaultAvatar} alt="avatar par défaut" className="bg-pourpre-50" />}
                <div className="p-4">
                  <h4 className="my-2 text-lg font-semibold">{`${profile.firstName} ${profile.lastName}`}</h4>
                  <div>
                    {['admin', 'caisse-claire', 'commission-musicale'].map((group) => (
                      <span className="px-2 py-1 m-1 inline-block bg-pourpre-500 text-white text-sm rounded-sm" key={group}>{group}</span>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      </Container>

    </>

  );
}
