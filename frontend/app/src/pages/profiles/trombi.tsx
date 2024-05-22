import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';

import defaultAvatar from '../../assets/default.svg';

export default function ProfilesPage() {
  const { usersApi } = useApiClient();

  const { data } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => usersApi.listProfilesApiV1ProfilesGet(),
  });
  const { data: waiting } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => usersApi.listInvitationsApiV1InvitationsGet(),
  });

  const { data: instruments } = useQuery({
    queryKey: ['instruments'],
    queryFn: () => usersApi.listInstrumentsApiV1InstrumentsGet(),
  });

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
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {data ? data.map((profile) => (
            <div key={profile.id}>
              <div className="rounded overflow-hidden shadow flex flex-col">
                <div className="aspect-square relative">
                  <img src={profile.pictureUrl ?? defaultAvatar} alt="profile" className="object-cover w-full h-full absolute bg-pourpre-50" />
                </div>
                <div className="p-4">
                  <h4 className="my-2 text-lg font-semibold">{`${profile.firstName} ${profile.lastName}`}</h4>
                  <div>
                    {(() => {
                      const instrument = instruments?.find((e) => e.id === profile.instrumentId);
                      if (!instrument) {
                        return null;
                      }
                      return (
                        <span className="px-2 py-1 m-1 inline-bloc text-white text-sm rounded-sm" style={{ backgroundColor: instrument.color }}>
                          {instrument.name}
                        </span>
                      );
                    })()}
                  </div>
                </div>

              </div>
            </div>
          )) : 'Loading'}
        </div>
        <h3 className="mt-8 mb-4 text-xl">En attente</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {waiting?.map((profile) => (
            <div key={profile.id}>
              <div className="rounded overflow-hidden shadow flex flex-col p-4">
                <h4 className="my-2 text-lg font-semibold">{`${profile.firstName} ${profile.lastName}`}</h4>
              </div>
            </div>
          ))}
        </div>
      </Container>

    </>

  );
}
