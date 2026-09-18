import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useApiClient, useUserProfile } from '../config/client';
import {
  upcomingDoodleEventsQuery,
  upcomingResponsesQuery,
} from '../pages/events/queries';

/**
 * Keeps the installed PWA icon badge (via the Badging API) in sync with the
 * number of upcoming doodle events the current member has not answered yet.
 *
 * "Unanswered" means: an upcoming event with `isInDoodle === true` for which
 * the current user has no `Response` row at all. Editing a response to
 * present/absent both count as answered - only the absence of any response
 * marks the event as pending.
 *
 * The Badging API is only available in secure contexts on installed PWAs
 * (and not on all browsers), so every call is feature-detected. When the
 * count is zero the badge is cleared rather than shown as "0".
 */
export function useAppBadge(): void {
  const { eventsApi } = useApiClient();
  const profile = useUserProfile();

  // This hook is mounted above the router, outside AuthGuard, so it renders
  // for guests too. Hold the authenticated queries back until the profile
  // probe confirms a signed-in member: a guest would only collect 401s.
  const { data: events } = useQuery({
    ...upcomingDoodleEventsQuery(eventsApi),
    enabled: !!profile,
  });
  const { data: responses } = useQuery({
    ...upcomingResponsesQuery(eventsApi),
    enabled: !!profile,
  });

  useEffect(() => {
    // Feature-detect: the Badging API is absent on unsupported browsers and
    // when the app is not installed as a PWA.
    if (!('setAppBadge' in navigator)) {
      return;
    }

    // Wait until we have everything needed to compute an accurate count.
    // Bailing out early avoids flashing a stale badge on first paint.
    if (!profile || !events || !responses) {
      return;
    }

    const answeredEventIds = new Set(
      responses
        .filter((response) => response.userId === profile.id)
        .map((response) => response.eventId),
    );

    const unanswered = events.filter(
      (event) => !answeredEventIds.has(event.id),
    ).length;

    if (unanswered > 0) {
      void navigator.setAppBadge(unanswered).catch(() => {
        // Setting the badge can reject (e.g. permission revoked); the badge is
        // a non-critical enhancement, so failures are intentionally ignored.
      });
    } else {
      void navigator.clearAppBadge().catch(() => {
        // Ignore: see above.
      });
    }
  }, [profile, events, responses]);
}
