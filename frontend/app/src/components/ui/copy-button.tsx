import { Check, Copy, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const COPY_FEEDBACK_MS = 2000;

/**
 * Copy a value to the clipboard, showing a brief "copied" confirmation and
 * announcing it to assistive tech. Reused wherever the UI offers a copy action
 * (invitation link, calendar ICS URL, ...).
 */
export function CopyButton({
  value,
  label = 'Copier',
  copiedLabel = 'Copié !',
  icon: Icon = Copy,
  variant = 'outline',
  className,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  icon?: LucideIcon;
  variant?: React.ComponentProps<typeof Button>['variant'];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    });
  };

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={onCopy}>
        {copied
          ? <Check data-icon="inline-start" aria-hidden="true" />
          : <Icon data-icon="inline-start" aria-hidden="true" />}
        {copied ? copiedLabel : label}
      </Button>
      {/* Announce the copy result without a visual change. */}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copié dans le presse-papiers.' : ''}
      </span>
    </>
  );
}
