/* eslint-disable react/require-default-props */
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { cva, type VariantProps } from 'class-variance-authority';
import LoaderAudio from '../assets/loader';

const buttonVariants = cva(
  'rounded-full inline-block border border-pourpre-500 uppercase transition m-1 font-bold text-sm whitespace-nowrap disabled:cursor-not-allowed hover:ring-2 hover:ring-pourpre-500 active:bg-pourpre-700 active:text-white focus:outline-none focus:ring-2 focus:ring-pourpre-300 disabled:bg-pourpre-200 disabled:border-pourpre-200',
  {
    variants: {
      size: {
        sm: 'py-1 px-2 text-xs font-semibold',
        md: 'py-2 px-4',
        lg: 'py-3 px-6',
        ll: '',
      },
      variant: {
        solid: 'bg-pourpre-500 text-white hover:bg-white hover:text-pourpre-600',
        outline: 'text-pourpre-600 hover:border-white hover:bg-pourpre-500 hover:text-white',
        ghost: 'border-none text-gray-900',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'solid',
    },
  },
);

type ButtonProps<C extends React.ElementType = 'button'> = {
  as?: C
  isLoading?: boolean
  icon?: IconProp
  ref?: React.Ref<any>
} & VariantProps<typeof buttonVariants>
  & Omit<React.ComponentPropsWithoutRef<C>, 'size' | 'variant'>;

export type { ButtonProps };

export default function Button<C extends React.ElementType = 'button'>({
  as,
  children,
  size,
  variant,
  icon,
  className,
  isLoading = false,
  ref,
  ...rest
}: ButtonProps<C>) {
  const Component = as || 'button';

  return (
    <Component
      ref={ref}
      type="button"
      className={buttonVariants({ size, variant, className: `${isLoading ? 'animate-pulse' : ''} ${className ?? ''}` })}
      disabled={isLoading}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...rest}
    >
      <div className="relative">
        <span className="w-full absolute">
          <LoaderAudio className={`m-auto h-4 ${!isLoading ? 'invisible' : ''}`} />
        </span>
        <span className={isLoading ? 'invisible' : ''}>
          {icon ? <span className="pr-3"><FontAwesomeIcon icon={icon} /></span> : null}
          {children}
        </span>
      </div>
    </Component>
  );
}

export { buttonVariants };
