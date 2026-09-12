import { Check, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Checkbox({
  value,
  disabled = false,
  onClick,
}: {
  disabled?: boolean;
  value: boolean | undefined;
  onClick: () => void;
}) {
  const stateClass = value === true
    ? 'bg-emerald-300'
    : value === false
      ? 'bg-red-300'
      : 'bg-sky-200';
  const icon = value === true
    ? <Check className="text-emerald-800" aria-hidden="true" />
    : value === false
      ? <X className="text-red-900" aria-hidden="true" />
      : <HelpCircle className="text-sky-800" aria-hidden="true" />;

  return (
    <td className={cn(stateClass, 'h-8 border-4 border-background')}>
      <div className="flex items-center justify-center">
        {disabled ? icon : (
          // Tri-state control: empty before the first answer, then tick/cross.
          // A dedicated button (not the shared Checkbox) because the shared
          // component is binary and hardcodes its check indicator.
          <button
            type="button"
            role="checkbox"
            aria-checked={value === true}
            aria-label="Modifier la réponse"
            className={cn(
              'flex size-6 items-center justify-center rounded-[5px] border-2 bg-background outline-none focus-visible:ring-3 focus-visible:ring-ring/30 [&>svg]:size-4',
              value === true ? 'border-primary' : 'border-border',
            )}
            onClick={onClick}
          >
            {value === true ? <Check className="text-emerald-800" aria-hidden="true" /> : null}
            {value === false ? <X className="text-red-900" aria-hidden="true" /> : null}
          </button>
        )}
      </div>
    </td>
  );
}
