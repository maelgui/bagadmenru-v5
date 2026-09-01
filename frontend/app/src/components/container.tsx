import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ContainerProps {
  className?: string;
  children: ReactNode;
}

export default function Container({ className, children }: ContainerProps) {
  return <div className={cn('container mx-auto p-4', className)}>{children}</div>;
}
