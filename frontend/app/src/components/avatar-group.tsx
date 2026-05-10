import type { ReactNode } from 'react';
import Avatar from './avatar';
import Tooltip from './tooltip';

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

function OverflowAvatar({ count, tooltip, size }: { count: number; tooltip?: ReactNode; size: AvatarSize }) {
  if (count <= 0) return null;
  const resolvedTooltip = tooltip ?? <span>+{count} autres</span>;
  return (
    <Tooltip content={resolvedTooltip}>
      <Avatar
        className="border-4 border-white"
        placeholder={`+${count}`}
        size={size}
      />
    </Tooltip>
  );
}

function AvatarWithTooltip({ avatar, size }: { avatar: AvatarItem; size: AvatarSize }) {
  return (
    <Tooltip content={<span>{avatar.name}</span>}>
      <Avatar
        className="border-4 border-white"
        src={avatar.src}
        title={avatar.name}
        size={size}
      />
    </Tooltip>
  );
}

function GroupEmptyMessage({ message = 'Aucun' }: { message?: string }) {
  return <span className="text-sm text-gray-500">{message}</span>;
}

function isGroupEmpty(avatars: AvatarItem[], extraCount: number): boolean {
  return avatars.length === 0 && extraCount === 0;
}

export default function AvatarGroup({
  avatars,
  max = Infinity,
  size = 'xs',
  extraCount = 0,
  extraTooltip,
  emptyMessage,
}: AvatarGroupProps) {
  if (isGroupEmpty(avatars, extraCount)) {
    return <GroupEmptyMessage message={emptyMessage} />;
  }

  const visible = avatars.slice(0, max);
  const truncatedCount = avatars.length - visible.length;

  return (
    <div className="flex -space-x-4">
      {visible.map((avatar) => (
        <AvatarWithTooltip key={avatar.id} avatar={avatar} size={size} />
      ))}
      {/* Show "+N" for truncated avatars from the same list */}
      <OverflowAvatar count={truncatedCount} size={size} />
      {/* Show "+N" for an external extra group (e.g. other instruments) */}
      <OverflowAvatar count={extraCount} tooltip={extraTooltip} size={size} />
    </div>
  );
}
