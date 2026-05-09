import { ReactNode } from 'react';
import Avatar from './avatar';
import Tooltip from './tooltip';

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
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg';
  /** Additional count to show as a "+N" overflow avatar (separate from max truncation) */
  extraCount?: number;
  /** Tooltip content for the extra count avatar */
  extraTooltip?: ReactNode;
  /** Message when both avatars and extraCount are empty */
  emptyMessage?: string;
}

export default function AvatarGroup({
  avatars,
  max = Infinity,
  size = 'xs',
  extraCount = 0,
  extraTooltip,
  emptyMessage = 'Aucun',
}: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const truncatedCount = avatars.length - visible.length;

  if (avatars.length === 0 && extraCount === 0) {
    return <span className="text-sm text-gray-500">{emptyMessage}</span>;
  }

  return (
    <div className="flex -space-x-4">
      {visible.map((avatar) => (
        <Tooltip
          key={avatar.id}
          content={<span>{avatar.name}</span>}
        >
          <Avatar
            className="border-4 border-white"
            src={avatar.src}
            title={avatar.name}
            size={size}
          />
        </Tooltip>
      ))}
      {/* Show "+N" for truncated avatars from the same list */}
      {truncatedCount > 0 ? (
        <Tooltip content={<span>+{truncatedCount} autres</span>}>
          <Avatar
            className="border-4 border-white"
            placeholder={`+${truncatedCount}`}
            size={size}
          />
        </Tooltip>
      ) : null}
      {/* Show "+N" for an external extra group (e.g. other instruments) */}
      {extraCount > 0 ? (
        <Tooltip content={extraTooltip ?? <span>+{extraCount} autres</span>}>
          <Avatar
            className="border-4 border-white"
            placeholder={`+${extraCount}`}
            size={size}
          />
        </Tooltip>
      ) : null}
    </div>
  );
}
