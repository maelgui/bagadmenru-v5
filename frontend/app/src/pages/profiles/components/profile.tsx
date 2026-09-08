import { BellOff } from 'lucide-react';
import type { Profile } from 'bagad-client';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GroupTag } from './groupTag';
import { usePermissions } from '../../../config/client';

export default function ProfileView({ profile }: { profile: Profile }) {
  const { can } = usePermissions();

  return (
    <div className="text-center">
      <div className="m-auto inline-block">
        <Avatar className="m-8 size-64">
          <AvatarImage src={profile.pictureUrl ?? undefined} alt="Photo du profil" />
          <AvatarFallback>{`${profile.firstName[0]}${profile.lastName[0]}`}</AvatarFallback>
        </Avatar>
      </div>
      <h1 className="text-4xl">
        {`${profile.firstName} ${profile.lastName}`}
        {!profile.receivesEmails && (
          <BellOff className="ml-3 inline size-5 text-destructive" aria-label="Ne reçoit pas les emails" />
        )}
      </h1>
      <div className="mt-8 -m-1 flex flex-wrap justify-center">
        {profile.groups.map((group) => (
          can('view', 'group')
            ? (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                <GroupTag name={group.name} color={group.color} />
              </Link>
            )
            : <GroupTag key={group.id} name={group.name} color={group.color} />
        ))}
      </div>
    </div>
  );
}
