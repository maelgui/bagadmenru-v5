import { faCirclePlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions } from '../../config/client';

import defaultAvatar from '../../assets/default.svg';

function GroupTag({ name, color }: { name: string, color: string | undefined }) {
  return (
    <span className="py-0.5 px-1 m-1 tracking-tighter font-thin text-xs inline-bloc text-white rounded-sm whitespace-nowrap" style={{ backgroundColor: color }}>
      {name}
    </span>

  );
}

export default function ProfilesPage() {
  const { usersApi } = useApiClient();
  const { has } = usePermissions();

  const { data } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => usersApi.listProfilesApiV1ProfilesGet(),
  });

  return (
    <>
      <Header
        title="Liste des membres"
        subtitle="Pensez à ajouter votre photo"
        actions={[
          <Header.Action key="edit-profile" as={Link} to="/profile/edit/me" variant="outline">Modifier mon profil</Header.Action>,
          <Header.Action key="add-profile" as={Link} to="/profile/add" className={has('ProfilesScopes.CREATE') ? '' : 'hidden'}>
            <FontAwesomeIcon icon={faCirclePlus} />
            {' '}
            Ajouter
          </Header.Action>,
        ]}
        breadcrumb={[
          { title: 'Liste des membres' },
        ]}
      />

      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {data ? data.map((profile) => (
            <Link key={profile.id} to={`/profile/${profile.id}`}>
              <div className="rounded overflow-hidden shadow flex pb-8 flex-col h-full">
                <div className="p-8">
                  <div className="aspect-square relative rounded-full overflow-hidden">
                    <img src={profile.pictureUrl ?? defaultAvatar} alt="profile" className="object-cover w-full h-full absolute bg-pourpre-50" />
                  </div>
                </div>
                <div className="pt-4 px-2 text-center">
                  <h4 className="my-2 text-lg font-semibold">{`${profile.firstName} ${profile.lastName}`}</h4>
                  <div>
                    {profile.instrument ? (
                      <GroupTag name={profile.instrument.name} color={profile.instrument.color} />
                    ) : null}
                    {profile.groups.map((group) => (
                      <GroupTag key={group.id} name={group.name} color={group.color} />
                    ))}
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
