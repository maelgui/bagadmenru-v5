import { Check, HelpCircle, X } from 'lucide-react';
import { Checkbox as CheckboxControl } from '@/components/ui/checkbox';
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
          <CheckboxControl
            aria-label="Modifier la réponse"
            checked={value === true}
            className="size-6 border-2 border-border bg-background data-checked:border-primary data-checked:bg-background data-checked:text-foreground [&>svg]:size-4"
            onClick={onClick}
          >
            {value === false ? <X className="text-red-900" aria-hidden="true" /> : null}
            {value === undefined ? <HelpCircle className="text-sky-800" aria-hidden="true" /> : null}
          </CheckboxControl>
        )}
      </div>
    </td>
  );
}
