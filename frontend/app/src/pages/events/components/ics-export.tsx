import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CalendarSyncDialog, { useCalendarSync } from './calendarSyncDialog';

/**
 * "Synchroniser" header button shared by the event pages (Doodle, Planning,
 * Gestion). Opens the same calendar sync dialog as the calendar page: it
 * mints a personal "Calendrier" API key and hands out the resulting ICS
 * link, with one-tap Google Agenda / Apple Calendar shortcuts.
 */
export default function IcsExportButton() {
  const { openSync, dialogProps } = useCalendarSync();

  return (
    <>
      <Button variant="outline" onClick={openSync}>
        <CalendarDays data-icon="inline-start" aria-hidden="true" />
        Synchroniser
      </Button>
      <CalendarSyncDialog
        open={dialogProps.open}
        onOpenChange={dialogProps.onOpenChange}
        links={dialogProps.links}
        isError={dialogProps.isError}
      />
    </>
  );
}
