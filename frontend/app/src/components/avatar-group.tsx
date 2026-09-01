import type { ReactNode } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type AvatarSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg';

interface AvatarItem {
  id: string;
  src?: string | null;
  name: string;
}

interface AvatarGroupProps {
  /** List of avatars to display individually */
  avatars: AvatarItem[];
  /** Maximum number of avatars to show before collapsing into "+N" (defaults to showing all) */
  max?: number;
  /** Size of each avatar */
  size?: AvatarSize;
  /** Additional count to show as a "+N" overflow avatar (separate from max truncation) */
  extraCount?: number;
  /** Tooltip content for the extra count avatar */
  extraTooltip?: ReactNode;
  /** Message when both avatars and extraCount are empty */
  emptyMessage?: string;
}

const avatarSizeClasses: Record<AvatarSize, string> = {
  xxs: 'size-10',
  xs: 'size-12',
  sm: 'size-24',
  md: 'size-48',
  lg: 'size-64',
};

const MAX_INITIALS = 2;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, MAX_INITIALS)
    .toUpperCase();
}

function OverflowAvatar({ count, tooltip, size }: { count: number; tooltip?: ReactNode; size: AvatarSize }) {
  if (count <= 0) return null;

  const content = tooltip ?? <span>+{count} autres</span>;

  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Avatar className={cn(avatarSizeClasses[size], 'ring-4 ring-background')}>
            <AvatarFallback>+{count}</AvatarFallback>
          </Avatar>
        )}
      />
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}

function AvatarWithTooltip({ avatar, size }: { avatar: AvatarItem; size: AvatarSize }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Avatar className={cn(avatarSizeClasses[size], 'ring-4 ring-background')}>
            <AvatarImage src={avatar.src ?? undefined} alt={avatar.name} />
            <AvatarFallback>{getInitials(avatar.name)}</AvatarFallback>
          </Avatar>
        )}
      />
      <TooltipContent>{avatar.name}</TooltipContent>
    </Tooltip>
  );
}

function GroupEmptyMessage({ message = 'Aucun' }: { message?: string }) {
  return <span className="text-sm text-muted-foreground">{message}</span>;
}

export default function AvatarGroup({
  avatars,
  max = Infinity,
  size = 'xs',
  extraCount = 0,
  extraTooltip,
  emptyMessage,
}: AvatarGroupProps) {
  if (avatars.length === 0 && extraCount === 0) {
    return <GroupEmptyMessage message={emptyMessage} />;
  }

  const visible = avatars.slice(0, max);
  const truncatedCount = avatars.length - visible.length;

  return (
    <div className="flex -space-x-4">
      {visible.map((avatar) => <AvatarWithTooltip key={avatar.id} avatar={avatar} size={size} />)}
      <OverflowAvatar count={truncatedCount} size={size} />
      <OverflowAvatar count={extraCount} tooltip={extraTooltip} size={size} />
    </div>
  );
}
