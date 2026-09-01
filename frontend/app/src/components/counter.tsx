import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type CounterProps = {
  type: 'error' | 'warning' | 'success' | 'info' | 'ghost';
  description: string;
  value: number | ReactNode;
} & ComponentPropsWithoutRef<'div'>;

const counterTypeClasses: Record<CounterProps['type'], string> = {
  error: 'text-destructive',
  warning: 'text-foreground',
  success: 'text-primary',
  info: 'text-foreground',
  ghost: 'text-foreground',
};

export default function Counter({
  type,
  description,
  value,
  className,
  ...rest
}: CounterProps) {
  return (
    <Card className={cn('surface rounded-4xl py-0 text-center', className)} {...rest}>
      <CardContent className="flex flex-col items-center gap-2 p-6">
        <div className={cn('font-heading text-4xl', counterTypeClasses[type])}>{value}</div>
        <div className="text-muted-foreground">{description}</div>
      </CardContent>
    </Card>
  );
}
