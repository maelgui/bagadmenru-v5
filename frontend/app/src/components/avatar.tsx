/* eslint-disable react/jsx-props-no-spreading */
import defaultAvatar from '../assets/default.svg';

interface AvatarProps extends React.ComponentPropsWithoutRef<'div'> {
  src: string | undefined | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const sizeClass = {
  xs: 'h-12 w-12',
  sm: 'h-24 w-24',
  md: 'h-48 w-48',
  lg: 'h-64 w-64',
};

export default function Avatar({
  src = undefined, size = 'md', className = '', ...rest
}: AvatarProps) {
  return (
    <div className={`${sizeClass[size]} rounded-full overflow-hidden bg-pourpre-50 ${className}`} {...rest}>
      <img className="object-cover min-w-full min-h-full" src={src ?? defaultAvatar} alt="profile" />
    </div>
  );
}
