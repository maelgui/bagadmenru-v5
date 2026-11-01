import { SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SEARCH_SHORTCUT, useOpenGlobalSearch } from './global-search';

// Compact trigger for the navigation bar.
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

// Field-like trigger for the home page: reads as a search box, opens the palette.
export function SearchField({ className }: { className?: string }) {
  const openSearch = useOpenGlobalSearch();
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-keyshortcuts={SEARCH_SHORTCUT.aria}
      className={cn(
        'surface flex h-14 w-full items-center gap-4 rounded-3xl px-5 text-left text-muted-foreground transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      <SearchIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="flex-1 truncate sm:hidden">Rechercher une partition, un membre…</span>
      <span className="hidden flex-1 truncate sm:inline">Rechercher une partition, un évènement, un membre…</span>
      <kbd className="hidden shrink-0 rounded-md border bg-muted px-2 py-0.5 font-sans text-xs sm:inline" aria-hidden="true">
        {SEARCH_SHORTCUT.label}
      </kbd>
    </button>
  );
}
