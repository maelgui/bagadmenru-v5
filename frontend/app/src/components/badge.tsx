/* eslint-disable react/jsx-props-no-spreading */
import { cva, type VariantProps } from 'class-variance-authority';
import { ReactNode } from 'react';

const badgeVariants = cva(
  'inline-block px-2 py-0.5 rounded-full overflow-hidden text-white font-medium text-xs whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-gray-500',
        muted: 'bg-gray-400',
        primary: 'bg-pourpre-500',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
        sortie: 'bg-camelot-600',
        repetition: 'bg-amber-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface BadgeProps extends React.ComponentPropsWithoutRef<'span'>, VariantProps<typeof badgeVariants> {
  children: ReactNode;
}

export default function Badge({
  children, variant, className, ...rest
}: BadgeProps) {
  return (
    <span
      className={badgeVariants({ variant, className })}
      {...rest}
    >
      {children}
    </span>
  );
}

export { badgeVariants };
