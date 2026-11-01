import {
  CalendarDaysIcon, ListChecksIcon, TableCellsMergeIcon, UserMinusIcon,
} from 'lucide-react';
import type { AppPage, Can } from '../../config/navigation';

export const CALENDAR_PATH = '/events/calendar';
export const DOODLE_PATH = '/events/';

// The three ways to look at upcoming events, in the order of the display switcher.
export const EVENT_VIEWS: AppPage[] = [
  { label: 'Calendrier', to: CALENDAR_PATH, icon: CalendarDaysIcon, permission: ['view', 'event'], keywords: ['mois', 'agenda'] },
  { label: 'Planning', to: '/events/planning', icon: ListChecksIcon, permission: ['view', 'response'], keywords: ['présences'] },
  { label: 'Doodle', to: `${DOODLE_PATH}?noRedirect=true`, icon: TableCellsMergeIcon, permission: ['view', 'response'], keywords: ['présences', 'tableau'] },
];

export const RESPONSE_HISTORY_PAGE: AppPage = {
  label: 'Désinscriptions', to: '/events/desinscriptions', icon: UserMinusIcon, permission: ['view', 'response_history'], keywords: ['absent', 'historique'],
};

// Where "Évènements" leads: the doodle for members who can see responses, the
// calendar otherwise.
export function eventsHomePath(can: Can): string {
  return can('view', 'response') ? DOODLE_PATH : CALENDAR_PATH;
}
