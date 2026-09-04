import { cn } from '@/lib/utils';

const FULL_CIRCLE = 100;
const DEFAULT_SIZE = 48;
const DEFAULT_STROKE_WIDTH = 3;

interface CircularProgressProps extends Omit<React.ComponentProps<'svg'>, 'width' | 'height'> {
  /** Progress value from 0 to 100 */
  value: number;
  /** Diameter of the ring in pixels */
  size?: number;
  /** Thickness of the ring stroke in pixels */
  strokeWidth?: number;
  /** Optional label rendered in the centre (defaults to `{value}%`) */
  label?: React.ReactNode;
}

function CircularProgress({
  value, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE_WIDTH, label, className, ...props
}: CircularProgressProps) {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(FULL_CIRCLE, Math.max(0, value));
  const offset = circumference * (1 - clamped / FULL_CIRCLE);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={FULL_CIRCLE}
        {...props}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      {label === null ? null : (
        <span className="absolute text-[0.625rem] font-semibold tabular-nums">
          {label ?? `${clamped}%`}
        </span>
      )}
    </div>
  );
}

export { CircularProgress };
