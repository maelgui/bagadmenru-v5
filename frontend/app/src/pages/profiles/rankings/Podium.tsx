import { Medal, Trophy, type LucideIcon } from 'lucide-react';
import type { UserRankingItem } from 'bagad-client';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials, type MetricDef } from '../rankings.helpers';

const PODIUM_CONFIG: Array<{ icon: LucideIcon; iconClass: string; ring: string }> = [
  { icon: Trophy, iconClass: 'text-amber-500', ring: 'ring-amber-400' },
  { icon: Medal, iconClass: 'text-slate-400', ring: 'ring-slate-300' },
  { icon: Medal, iconClass: 'text-orange-700', ring: 'ring-orange-600' },
];

// Podium display order: 2nd, 1st, 3rd, with 1st raised in the middle.
// The podium keeps its 3-column shape on mobile: everything is simply smaller.
const PODIUM_LAYOUT = [
  { order: 'order-2', height: 'h-12 md:h-20', avatar: 'size-16 md:size-24' }, // 1st
  { order: 'order-1', height: 'h-9 md:h-14', avatar: 'size-14 md:size-20' }, // 2nd
  { order: 'order-3', height: 'h-8 md:h-10', avatar: 'size-14 md:size-20' }, // 3rd
];

function PodiumCard({
  item,
  position,
  metric,
}: {
  item: UserRankingItem;
  position: number;
  metric: MetricDef;
}) {
  const { icon: Icon, iconClass, ring } = PODIUM_CONFIG[position];
  const layout = PODIUM_LAYOUT[position];
  const { user } = item;

  return (
    <div className={`flex w-full flex-col items-center ${layout.order}`}>
      <Link
        to={`/profile/${user.id}`}
        className="flex w-full min-w-0 flex-col items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Icon className={`mb-2 size-5 md:size-7 ${iconClass}`} aria-hidden="true" />
        <Avatar className={`${layout.avatar} ring-2 md:ring-4 ${ring} ring-offset-2 ring-offset-background`}>
          <AvatarImage src={user.pictureUrl ?? undefined} alt={`${user.firstName} ${user.lastName}`} />
          <AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback>
        </Avatar>
        <span className="mt-3 w-full truncate text-center text-sm font-bold md:text-base">
          {user.firstName}
        </span>
        <span className="w-full truncate text-center text-xs font-semibold text-muted-foreground md:text-sm">
          {metric.format(metric.value(item.ranks))}
        </span>
      </Link>
      <div
        className={`mt-3 flex w-full items-start justify-center rounded-t-xl bg-muted pt-2 text-xl font-black text-muted-foreground md:text-2xl ${layout.height}`}
      >
        {position + 1}
      </div>
    </div>
  );
}

export function Podium({ top, metric }: { top: UserRankingItem[]; metric: MetricDef }) {
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-3 items-end gap-2 md:gap-4">
      {top.map((item, index) => (
        <PodiumCard key={item.user.id} item={item} position={index} metric={metric} />
      ))}
    </div>
  );
}
