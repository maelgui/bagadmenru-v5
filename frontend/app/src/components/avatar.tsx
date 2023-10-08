import defaultAvatar from '../assets/default.svg';

interface AvatarProps {
  src: string | undefined | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const sizeClass = {
  xs: 'h-12 w-12',
  sm: 'h-24 w-24',
  md: 'h-48 w-48',
  lg: 'h-64 w-64',
};

export default function Avatar({ src = undefined, size = 'md' }: AvatarProps) {
  return (
    <div className={`${sizeClass[size]} m-8 rounded-full overflow-hidden bg-pourpre-50`}>
      <img className="object-cover min-w-full min-h-full" src={src ?? defaultAvatar} alt="profile" />
    </div>
  );
}
