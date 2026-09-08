import { BadgeAlert, BadgeCheck, CircleDashed } from 'lucide-react';
import { MembershipStatus } from 'bagad-client';
import { cn } from '@/lib/utils';
import { useMembership } from '../../../config/client';

// Colour-coded per status, mirroring the trombinoscope's membership pill:
//   active  -> green, labelled with the paid season (e.g. "2026-2027")
//   expired -> amber, "Expirée"
//   none    -> muted, "Sans adhésion"
const STATUS_META: Record<
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
 * Compact, at-a-glance membership status for the current season. Used on the
 * profile page; the full history lives on the dedicated membership page. Styled
 * to match the trombinoscope's membership pill.
 */
export default function MembershipBadge({ profileId }: { profileId?: string } = {}) {
  const { data: membership } = useMembership(profileId);

  if (!membership) {
    return null;
  }

  const meta = STATUS_META[membership.status];
  const Icon = meta.icon;
  // Only the active pill shows the season label; expired/none use their text.
  const text = membership.status === MembershipStatus.Active
    ? membership.currentSeason
    : meta.label;
  const aria = membership.status === MembershipStatus.Active
    ? `${meta.aria}, saison ${membership.currentSeason}`
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
