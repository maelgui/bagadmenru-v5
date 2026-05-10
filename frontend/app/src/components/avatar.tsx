import defaultAvatar from '../assets/default.svg';

interface AvatarProps extends React.ComponentPropsWithoutRef<'div'> {
  src?: string | undefined | null
  size?: 'xxxs' | 'xxs' | 'xs' | 'sm' | 'md' | 'lg'
  placeholder?: string
}

const sizeClass = {
  xxxs: 'h-6 w-6',
  xxs: 'h-10 w-10',
  xs: 'h-12 w-12',
  sm: 'h-24 w-24',
  md: 'h-48 w-48',
  lg: 'h-64 w-64',
};

export default function Avatar({
  src = undefined, size = 'md', className = '', placeholder = undefined, ...rest
}: AvatarProps) {
  return (
    <div className={`${sizeClass[size]} ${placeholder ? 'bg-gray-600 text-gray-100' : 'bg-pourpre-50'} flex justify-center items-center align-middle rounded-full overflow-hidden ${className}`} {...rest}>
      {placeholder ? (
        <span className="">{placeholder}</span>
      ) : (
        <img className="object-cover min-w-full min-h-full" src={src ?? defaultAvatar} alt="profile" />
      )}
    </div>
  );
}
