import { Profile } from 'bagad-client';
import { Link } from 'react-router-dom';
import Avatar from '../../../components/avatar';
import Badge from '../../../components/badge';

export default function ProfileView({ profile }: { profile: Profile }) {
  return (
    <div className="text-center">
      <div className="inline-block m-auto">
        <Avatar src={profile.pictureUrl} size="lg" className="m-8" />
      </div>
      <h1 className="text-4xl">{`${profile.firstName} ${profile.lastName}`}</h1>
      <ul className="mt-8">
        {profile.instrument ? (<Link to={`/groups/${profile.instrument.id}`}><Badge className="m-2" style={{ backgroundColor: profile.instrument.color }}>{profile.instrument.name}</Badge></Link>) : null}
        {profile.groups?.map((g) => <Link key={g.id} to={`/groups/${g.id}`}><Badge className="bg-pourpre-500 m-2">{g.name}</Badge></Link>)}
      </ul>
    </div>
  );
}
