import {
  createContext, type ReactNode, useCallback, useContext, useEffect, useState,
} from 'react';
import GlobalSearchDialog from './global-search-dialog';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

export const SEARCH_SHORTCUT = {
  label: isMac ? '⌘ K' : 'Ctrl K',
  aria: isMac ? 'Meta+K' : 'Control+K',
};

const GlobalSearchContext = createContext<(() => void) | null>(null);

// Single owner of the search palette: one dialog, one ⌘K listener, any number
// of triggers calling `useOpenGlobalSearch()`.
export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSearch = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((isOpen) => !isOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <GlobalSearchContext.Provider value={openSearch}>
      {children}
      <GlobalSearchDialog open={open} onOpenChange={setOpen} />
    </GlobalSearchContext.Provider>
  );
}

export function useOpenGlobalSearch(): () => void {
  const openSearch = useContext(GlobalSearchContext);
  if (!openSearch) {
    throw new Error('useOpenGlobalSearch must be used within a GlobalSearchProvider');
  }
  return openSearch;
}
