import { useLoaderData } from 'react-router-dom';
import { Profile } from '../client';

export default function ProfilesPage() {
  const data = useLoaderData() as Array<Profile>;
  return (
    <div className="grid grid-cols-6 gap-4">
      {data.map((profile) => (
        <div key={profile.id}>
          <div className="rounded overflow-hidden shadow flex flex-col">
            <img src={profile.picture} alt="profile" />
            <div className="p-4">
              <h4 className="my-2 text-lg font-semibold">{profile.name}</h4>
              <div>
                {['admin', 'caisse-claire', 'commission-musicale'].map((group) => (
                  <span className="px-2 py-1 m-2 inline-block bg-pourpre-500 text-white text-sm rounded-sm" key={group}>{group}</span>
                ))}
              </div>
            </div>

          </div>
        </div>
      ))}
    </div>
  );
}
