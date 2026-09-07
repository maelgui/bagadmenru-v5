import { MembershipStatus } from 'bagad-client';
import { Badge } from '@/components/ui/badge';
import { useMembership } from '../../../config/client';

const STATUS_META: Record<
  MembershipStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  [MembershipStatus.Active]: { label: 'Adhésion à jour', variant: 'default' },
  [MembershipStatus.Expired]: { label: 'Adhésion expirée', variant: 'secondary' },
  [MembershipStatus.None]: { label: 'Aucune adhésion', variant: 'outline' },
};

/**
 * Compact, at-a-glance membership status for the current season. Used on the
 * profile page; the full history lives on the dedicated membership page.
 */
export default function MembershipBadge({ profileId }: { profileId?: string } = {}) {
  const { data: membership } = useMembership(profileId);

  if (!membership) {
    return null;
  }

  const meta = STATUS_META[membership.status];

  return (
    <Badge variant={meta.variant} aria-label={`${meta.label} (saison ${membership.currentSeason})`}>
      {meta.label}
      {membership.status === MembershipStatus.Active && (
        <span className="opacity-80">{` · ${membership.currentSeason}`}</span>
      )}
    </Badge>
  );
}
