import { faCirclePlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions } from '../../config/client';

import defaultAvatar from '../../assets/default.svg';

export default function ProfilesPage() {
  const { usersApi } = useApiClient();
  const { has } = usePermissions();

  const { data } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => usersApi.listProfilesApiV1ProfilesGet(),
  });

  const actions = [
    <Header.Action key="edit-profile" as={Link} to="/profile/edit/me" variant="outline">Modifier mon profil</Header.Action>,
  ];
  if (has('ProfilesScopes.CREATE')) {
    actions.push(
      <Header.Action key="add-profile" as={Link} to="/profile/edit/add">
        <FontAwesomeIcon icon={faCirclePlus} />
        {' '}
        Ajouter
      </Header.Action>,
    );
  }

  return (
    <>
      <Header
        title="Liste des membres"
        subtitle="Pensez à ajouter votre photo"
        actions={actions}
        breadcrumb={[
          { title: 'Liste des membres' },
        ]}
      />

      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {data ? data.map((profile) => (
            <Link key={profile.id} to={`/profile/${profile.id}`}>
              <div className="rounded overflow-hidden shadow flex flex-col p-8 h-full">
                <div className="aspect-square relative rounded-full overflow-hidden">
                  <img src={profile.pictureUrl ?? defaultAvatar} alt="profile" className="object-cover w-full h-full absolute bg-pourpre-50" />
                </div>
                <div className="pt-4 text-center">
                  <h4 className="my-2 text-lg font-semibold">{`${profile.firstName} ${profile.lastName}`}</h4>
                  <div>
                    {profile.instrument ? (
                      <span className="px-2 py-1 m-1 inline-bloc text-white text-sm rounded-sm" style={{ backgroundColor: profile.instrument.color }}>
                        {profile.instrument.name}
                      </span>
                    ) : null}
                  </div>
                </div>

              </div>
            </Link>
          )) : 'Loading'}
        </div>
      </Container>

    </>

  );
}
