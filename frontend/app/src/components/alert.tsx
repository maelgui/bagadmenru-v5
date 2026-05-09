import {
  faCheckCircle, faCircleExclamation, faCircleXmark, faInfo,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { cva, type VariantProps } from 'class-variance-authority';
import { ReactNode } from 'react';

const alertVariants = cva(
  'relative py-4 px-6 mb-8',
  {
    variants: {
      type: {
        error: 'bg-red-100 text-red-900',
        warning: 'bg-amber-100 text-amber-900',
        success: 'bg-emerald-300 text-emerald-950',
        info: 'bg-sky-100 text-sky-950',
        gradient: 'bg-gradient-to-r from-[#ffe3f3] to-[#c1dfff]',
      },
    },
  },
);

const alertIcons = {
  error: faCircleXmark,
  warning: faCircleExclamation,
  success: faCheckCircle,
  info: faInfo,
  gradient: faInfo,
} as const;

interface AlertProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'type'>, VariantProps<typeof alertVariants> {
  type: 'error' | 'warning' | 'success' | 'info' | 'gradient';
  children: ReactNode;
}

export default function Alert({ type, children, className, ...rest }: AlertProps) {
  const icon = alertIcons[type];

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <div className={alertVariants({ type, className })} {...rest}>
      <span className="absolute top-0 bottom-0 flex items-center">
        <FontAwesomeIcon icon={icon} className="mr-4" />
      </span>
      <div className="pl-6">{children}</div>
    </div>
  );
}

export { alertVariants };
