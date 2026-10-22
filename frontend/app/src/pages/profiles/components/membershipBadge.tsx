import { BadgeAlert, BadgeCheck, CircleDashed } from 'lucide-react';
import { MembershipStatus } from 'bagad-client';
import { cn } from '@/lib/utils';
import { useMembership } from '../../../config/client';

// Colour-coded per status:
//   active  -> green, labelled with the paid season (e.g. "2026-2027")
//   expired -> amber, "Expirée"
//   none    -> muted, "Sans adhésion"
export const MEMBERSHIP_META: Record<
  MembershipStatus,
  { icon: typeof BadgeCheck; className: string; label: string; aria: string }
> = {
  [MembershipStatus.Active]: {
    icon: BadgeCheck,
    className: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
    label: 'À jour',
    aria: 'Adhésion à jour',
  },
  [MembershipStatus.Expired]: {
    icon: BadgeAlert,
    className: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    label: 'Expirée',
    aria: 'Adhésion expirée',
  },
  [MembershipStatus.None]: {
    icon: CircleDashed,
    className: 'bg-muted text-muted-foreground',
    label: 'Sans adhésion',
    aria: 'Aucune adhésion',
  },
};

/**
 * Stateless membership pill. Shared by the trombinoscope, the profile page and
 * the admin screens so every surface renders the status identically.
 */
export function MembershipStatusPill({
  status,
  season,
}: {
  status?: MembershipStatus | null;
  season?: string | null;
}) {
  if (status == null) {
    return null;
  }
  const meta = MEMBERSHIP_META[status];
  const Icon = meta.icon;
  // Only the active pill shows the season label; expired/none use their text.
  const text = status === MembershipStatus.Active && season ? season : meta.label;
  const aria = status === MembershipStatus.Active && season
    ? `${meta.aria}, saison ${season}`
    : meta.aria;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        meta.className,
      )}
      aria-label={aria}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {text}
    </span>
  );
}

/**
 * Membership pill for a member, fetching its status. Used on the profile page;
 * the full history lives on the dedicated membership page.
 */
export default function MembershipBadge({ profileId }: { profileId?: string } = {}) {
  const { data: membership } = useMembership(profileId);

  if (!membership) {
    return null;
  }

  return <MembershipStatusPill status={membership.status} season={membership.currentSeason} />;
}
