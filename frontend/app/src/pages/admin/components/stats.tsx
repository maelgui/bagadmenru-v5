import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Big number with a caption; `undefined` renders a loading skeleton. */
export function Stat({ value, label }: { value: number | undefined; label: string }) {
  return (
    <div>
      <p className="text-3xl font-semibold tabular-nums">
        {value === undefined ? <Skeleton className="h-9 w-12" /> : value}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Tinted tile: icon, number (optionally with a share of a total) and caption.
 * The tint is passed by the caller so status colours stay with their meaning.
 */
export function StatTile({
  icon: Icon,
  value,
  total,
  label,
  className,
}: {
  icon: LucideIcon;
  value: number | undefined;
  total?: number;
  label: string;
  className?: string;
}) {
  const percent = value !== undefined && total ? Math.round((value / total) * PERCENT) : null;
  return (
    <div className={cn('flex items-start gap-3 rounded-3xl p-4', className ?? 'bg-muted')}>
      <Icon className="mt-1 size-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-2xl font-semibold tabular-nums">
          {value === undefined ? <Skeleton className="h-8 w-10" /> : value}
          {percent !== null ? <span className="ml-2 text-sm font-normal">{percent} %</span> : null}
        </p>
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}

const PERCENT = 100;
