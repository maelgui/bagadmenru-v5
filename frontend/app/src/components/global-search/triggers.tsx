import { SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
