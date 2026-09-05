import { useIsFetching } from '@tanstack/react-query';

import { Spinner } from '@/components/ui/spinner';
import logo from '../assets/logov2full.svg';
import logoDark from '../assets/logov2full-dark.svg';

export default function ErrorLayout({ children }: React.ComponentPropsWithoutRef<'div'>) {
  const isFetching = useIsFetching();

  // This is the router's root ErrorBoundary, so it can render even when an
  // error prevented the ThemeProvider from mounting. Read the applied theme
  // directly from the <html> class (set by the anti-flash script and the
  // provider) instead of the useTheme hook, which would throw here.
  const isDark = typeof document !== 'undefined'
    && document.documentElement.classList.contains('dark');

  return (
    <div className="flex min-h-screen bg-muted/40 p-4 text-foreground">
      <div className="m-auto flex w-full max-w-md flex-col items-center gap-6">
        <div className="relative flex justify-center">
          <img src={isDark ? logoDark : logo} alt="Bagad Men Ru" className="h-64" />
          {isFetching ? <Spinner className="absolute right-0 top-0" aria-label="Chargement" /> : null}
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
