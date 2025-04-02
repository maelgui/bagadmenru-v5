/* eslint-disable react/jsx-props-no-spreading */
import { ReactNode } from 'react';

interface BadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  children: ReactNode,
  color?: string,
}

export default function Badge({
  children, color = 'bg-gray-500', className, ...rest
}: BadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full overflow-hidden text-white font-medium text-xs ${color} ${className} whitespace-nowrap`} {...rest}>
      {children}
    </span>
  );
}
