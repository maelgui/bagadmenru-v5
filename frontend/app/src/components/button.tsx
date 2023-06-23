export type ButtonProps<T extends React.ElementType> = {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'll'
  outline?: boolean
  as?: T
} & React.ComponentPropsWithoutRef<T>;

export default function Button<T extends React.ElementType = 'button'>({
  children, size = 'md', outline = false, as = undefined, ...rest
}: ButtonProps<T>) {
  const classList = [];
  switch (size) {
    case 'sm':
      classList.push('py-1', 'px-2', 'text-xs', 'font-semibold');
      break;
    case 'md':
      classList.push('py-2', 'px-4');
      break;
    case 'lg':
      classList.push('py-3', 'px-6');
      break;

    default:
      break;
  }
  if (outline) {
    classList.push('bg-white', 'text-pourpre-600', 'hover:border-pourpre-200', 'hover:bg-pourpre-400', 'hover:text-white');
  } else {
    classList.push('bg-pourpre-500', 'text-white', 'hover:border-pourpre-200', 'hover:bg-white', 'hover:text-pourpre-600');
  }
  const Component = as || 'button';
  return (
    <Component
      className={`${classList.join(' ')} inline-block border border-pourpre-500 uppercase transition m-1 font-bold text-sm`}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...rest}
    >
      {children}
    </Component>
  );
}
