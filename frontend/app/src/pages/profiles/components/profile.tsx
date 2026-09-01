import { BellOff } from 'lucide-react';
import type { Profile } from 'bagad-client';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {profile.groups.map((group) => (
          can('view', 'group')
            ? (
              <Link key={group.id} to={`/groups/${group.id}`}>
                <Badge className="text-primary-foreground" style={{ backgroundColor: group.color }}>{group.name}</Badge>
              </Link>
            )
            : <Badge key={group.id} className="text-primary-foreground" style={{ backgroundColor: group.color }}>{group.name}</Badge>
        ))}
      </div>
    </div>
  );
}
