import { useEffect, useRef } from 'react';
import { useLocation, useMatches } from 'react-router-dom';
import { audit } from '../config/audit';
import { AuthStatus, useAuth } from '../config/client';
import { describeClickTarget, routePattern } from '../lib/audit-dom';

/**
 * Renderless component feeding the audit tracker from the router and the DOM.
 * Mounted once at the root route, so it sees every page:
 * - a PAGE_VIEW per route change (pattern as name, concrete path as path);
 * - a CLICK per activation of an interactive element, caught in the capture
 *   phase on `document` so no per-button instrumentation is needed;
 * - a keepalive flush when the page is hidden or unloaded.
 * Events are only sent for a signed-in member (see AuditActorState).
 */
export default function AuditTracker() {
  const { status } = useAuth();
  const location = useLocation();
  const matches = useMatches();

  useEffect(() => {
    const actor = {
      [AuthStatus.Unknown]: 'pending',
      [AuthStatus.Guest]: 'guest',
      [AuthStatus.Authenticated]: 'member',
    } as const;
    audit.setActor(actor[status]);
  }, [status]);

  // Page views. The ref dedupes StrictMode's double effect run in development.
  const lastPathname = useRef<string | null>(null);
  const params = matches[matches.length - 1]?.params ?? {};
  useEffect(() => {
    if (lastPathname.current === location.pathname) return;
    lastPathname.current = location.pathname;
    audit.track('PAGE_VIEW', routePattern(location.pathname, params), location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params only changes together with pathname; listing it would re-run the effect for the same page
  }, [location.pathname]);

  // Clicks and unload flushes: registered once, reading the current path
  // through a ref so the listener never has to be re-attached.
  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const description = describeClickTarget(event.target);
      if (description) {
        audit.track('CLICK', description.name, pathnameRef.current, description.details);
      }
    };
    const onHide = () => {
      void audit.flush(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
