import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Name + email, linking to the member's profile. Used by every admin table. */
export function MemberIdentity({
  member,
  children,
}: {
  member: { id: string; firstName: string; lastName: string; email: string };
  children?: ReactNode;
}) {
  return (
    <Link to={`/profile/${member.id}`} className="flex flex-col hover:underline">
      <span className="font-medium">
        {member.firstName} {member.lastName}
        {children}
      </span>
      <span className="text-xs text-muted-foreground">{member.email}</span>
    </Link>
  );
}
