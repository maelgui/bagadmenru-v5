import { SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SEARCH_SHORTCUT, useOpenGlobalSearch } from './global-search';

// Icon trigger (navigation bar on small screens).
export function SearchButton() {
  const openSearch = useOpenGlobalSearch();
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button type="button" variant="ghost" size="icon" />}
        onClick={openSearch}
        aria-label="Rechercher"
        aria-keyshortcuts={SEARCH_SHORTCUT.aria}
      >
        <SearchIcon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>{`Rechercher (${SEARCH_SHORTCUT.label})`}</TooltipContent>
    </Tooltip>
  );
}

const FIELD_SIZE = {
  sm: {
    root: 'h-10 w-64 gap-2 px-3.5 text-sm shadow-xs',
    icon: 'size-4',
    kbd: 'px-1.5',
    label: 'Rechercher…',
  },
  lg: {
    root: 'h-14 w-full gap-3 px-5 text-base shadow-lg',
    icon: 'size-5 text-primary',
    kbd: 'hidden px-2 sm:inline',
    label: 'Une partition, un évènement, un membre…',
  },
};

// Field-like trigger: reads as a search box, opens the palette.
export function SearchField({ size = 'sm', className }: { size?: keyof typeof FIELD_SIZE; className?: string }) {
  const openSearch = useOpenGlobalSearch();
  const styles = FIELD_SIZE[size];
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-keyshortcuts={SEARCH_SHORTCUT.aria}
      className={cn(
        'flex items-center rounded-full border border-input bg-card text-left text-muted-foreground transition-colors hover:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        styles.root,
        className,
      )}
    >
      <SearchIcon className={cn('shrink-0', styles.icon)} aria-hidden="true" />
      <span className="flex-1 truncate">{styles.label}</span>
      <kbd className={cn('shrink-0 rounded-md border bg-muted py-0.5 font-sans text-xs', styles.kbd)} aria-hidden="true">
        {SEARCH_SHORTCUT.label}
      </kbd>
    </button>
  );
}
