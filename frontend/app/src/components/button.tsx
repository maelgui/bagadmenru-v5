/* eslint-disable react/require-default-props */
import { forwardRef } from 'react';

type ButtonOwnProps<C extends React.ElementType> = {
  as?: C
  size?: 'sm' | 'md' | 'lg' | 'll'
  variant?: 'solid' | 'outline' | 'ghost'
} & React.ComponentPropsWithoutRef<'button'>;

export type ButtonProps<C extends React.ElementType> =
  ButtonOwnProps<C> & Omit<React.ComponentProps<C>, keyof ButtonOwnProps<C>>;

type PolymorphicRef<C extends React.ElementType> =
  React.ComponentPropsWithRef<C>['ref'];

function PrivateButton<C extends React.ElementType = 'button'>(
  {
    as, children, size = 'md', variant = 'solid', className, ...rest
  }: ButtonProps<C>,
  ref: PolymorphicRef<C>,
) {
  const Component = as || 'button';
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

  switch (variant) {
    case 'solid':
      classList.push('bg-pourpre-500', 'text-white', 'hover:border-pourpre-200', 'hover:bg-white', 'hover:text-pourpre-600');
      break;
    case 'outline':
      classList.push('text-pourpre-600', 'hover:border-pourpre-200', 'hover:bg-pourpre-400', 'hover:text-white');
      break;
    case 'ghost':
      classList.push('border-none', 'text-gray-900', 'hover:bg-gray-100');
      break;

    default:
      break;
  }

  return (
    <Component
      ref={ref}
      type="button"
      className={`${classList.join(' ')} rounded-full inline-block border border-pourpre-500 uppercase transition m-1 font-bold text-sm ${className} whitespace-nowrap disabled:cursor-not-allowed`}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...rest}
    >
      {children}
    </Component>
  );
}

// TODO: Fix
// @ts-ignore
const Button = forwardRef(PrivateButton) as typeof PrivateButton;
export default Button;
