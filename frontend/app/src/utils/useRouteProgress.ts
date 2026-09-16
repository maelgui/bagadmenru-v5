import { useIsFetching } from '@tanstack/react-query';
import nprogress from 'nprogress';
import { useEffect } from 'react';
import { useNavigation } from 'react-router-dom';

/**
 * Drives the top progress bar (nprogress) from the two "work in flight"
 * signals and reports whether anything is pending:
 *
 * - `useIsFetching()`: react-query requests (data loading on the current page);
 * - `useNavigation()`: router transitions. Every page is lazy-loaded, so on a
 *   slow network the router sits on the current page while it downloads the
 *   next page's JS chunk -- without this signal a link click gives no feedback
 *   at all until the page swaps in.
 *
 * Must be called from inside the router (both layouts are).
 */
export function useRouteProgress(): boolean {
  const isFetching = useIsFetching();
  const navigation = useNavigation();
  const busy = isFetching > 0 || navigation.state !== 'idle';

  useEffect(() => {
    if (busy) {
      nprogress.inc();
    } else {
      nprogress.done();
    }
  }, [busy]);

  return busy;
}
