import { ReactNode } from 'react';

interface BadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  children: ReactNode,
  color?: string,
}

export default function Badge({ children, color = 'bg-gray-500', className }: BadgeProps) {
  return (
    <span className={`inline-block px-2 rounded-md overflow-hidden text-white font-medium text-sm ${color} ${className} whitespace-nowrap`}>
      {children}
    </span>
  );
}
