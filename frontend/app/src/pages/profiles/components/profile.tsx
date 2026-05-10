import { faBellSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Profile } from 'bagad-client';
import { Link } from 'react-router-dom';
import Avatar from '../../../components/avatar';
import Badge from '../../../components/badge';
import { usePermissions } from '../../../config/client';

export default function ProfileView({ profile }: { profile: Profile }) {
  const { can } = usePermissions();

  return (
    <div className="text-center">
      <div className="inline-block m-auto">
        <Avatar src={profile.pictureUrl} size="lg" className="m-8" />
      </div>
      <h1 className="text-4xl">
        {`${profile.firstName} ${profile.lastName}`}
        {!profile.receivesEmails && (
          <FontAwesomeIcon icon={faBellSlash} className="ml-3 text-red-400 text-xl" aria-label="Ne reçoit pas les emails" />
        )}
      </h1>
      <ul className="mt-8">
        {profile.groups.map((g) => (
          <span key={g.id} className="m-2">
            {can('view', 'group')
              ? <Link to={`/groups/${g.id}`}><Badge style={{ backgroundColor: g.color }}>{g.name}</Badge></Link>
              : <Badge style={{ backgroundColor: g.color }}>{g.name}</Badge>}
          </span>
        ))}
      </ul>
    </div>
  );
}
