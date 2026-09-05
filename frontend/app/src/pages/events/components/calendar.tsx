import type { Event } from 'bagad-client';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { calendarDays } from '../../../utils/calendar';
import { toIsoDate } from '../../../utils/date';
import EventCategories from '../../../utils/event-category';
import groupBy from '../../../utils/groupby';

const MAX_VISIBLE_EVENTS = 2;

const days = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

interface CalendarProps extends React.ComponentPropsWithoutRef<'div'> {
  events: Event[];
  monthOffset?: number;
  displayContent?: boolean;
  /** When true, drops the outer surface/border wrapper (e.g. when nested in a Card). */
  bare?: boolean;
}

interface CalendarDayProps {
  day: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayEvents: Event[] | undefined;
  displayContent: boolean;
}

function DayEventBadge({ event }: { event: Event }) {
  const category = EventCategories[event.category];
  return (
    <Badge variant={category?.variant ?? 'default'} className={cn('mb-px block w-full truncate rounded-sm text-ellipsis', category?.className)}>
      {event.title}
    </Badge>
  );
}

function CalendarDay({
  day, isCurrentMonth, isToday, dayEvents, displayContent,
}: CalendarDayProps) {
  const events = dayEvents ?? [];

  return (
    <Popover>
      <PopoverTrigger
        render={(
          <div
            className={cn(
              'flex aspect-square flex-col items-center bg-card p-1',
              !isCurrentMonth && 'opacity-50',
            )}
          />
        )}
      >
        <div className={cn(
          'm-1 inline-flex size-8 items-center justify-center rounded-full',
          isToday && 'bg-primary text-primary-foreground',
          events.length > 0 && 'border border-primary',
        )}>
          {day.getDate()}
        </div>
        {displayContent && (
          <div className="hidden w-full md:block">
            {events.slice(0, MAX_VISIBLE_EVENTS).map((event) => (
              <DayEventBadge key={event.id} event={event} />
            ))}
            <div className="pt-1 pl-2 text-sm">
              {events.length > MAX_VISIBLE_EVENTS ? `+${events.length - MAX_VISIBLE_EVENTS}` : ''}
            </div>
          </div>
        )}
      </PopoverTrigger>
      {events.length > 0 ? (
        <PopoverContent>
          {events.map((event) => (
            <div key={event.id} className="py-1">
              <div className="font-bold">{event.title}</div>
              <div>{event.description || 'Pas de description'}</div>
            </div>
          ))}
        </PopoverContent>
      ) : null}
    </Popover>
  );
}

export default function Calendar({
  events,
  monthOffset = 0,
  displayContent = false,
  bare = false,
}: CalendarProps) {
  const eventsByDate = groupBy(events, (item) => toIsoDate(item.date));

  return (
    <div className={cn(!bare && 'surface rounded-4xl p-3')}>
      <div className="grid grid-cols-7">
        {days.map((day) => <div key={day} className="text-center font-bold uppercase">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px border border-border bg-border">
        {Array.from(calendarDays(monthOffset)).map(({ day, isCurrentMonth, isToday }) => (
          <CalendarDay
            key={day.getTime()}
            day={day}
            isCurrentMonth={isCurrentMonth}
            isToday={isToday}
            dayEvents={eventsByDate.get(toIsoDate(day))}
            displayContent={displayContent}
          />
        ))}
      </div>
    </div>
  );
}
