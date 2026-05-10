import type { Event } from 'bagad-client';
import Badge from '../../../components/badge';
import Tooltip from '../../../components/tooltip';
import { toIsoDate } from '../../../utils/date';
import EventCategories from '../../../utils/event-category';
import groupBy from '../../../utils/groupby';

const DAYS_IN_WEEK = 7;
const MONTHS_IN_YEAR = 12;
const MAX_VISIBLE_EVENTS = 2;

function* generator(monthOffset: number, dayOffset = 1) {
  const today = new Date();
  const currentMonth = today.getMonth() + monthOffset;
  const firstDay = new Date(Date.UTC(today.getFullYear(), currentMonth, 1));
  const lastDay = new Date(Date.UTC(today.getFullYear(), currentMonth + 1, 0));
  firstDay.setDate(firstDay.getDate() - ((firstDay.getDay() - dayOffset + DAYS_IN_WEEK) % DAYS_IN_WEEK));
  lastDay.setDate(lastDay.getDate() + ((DAYS_IN_WEEK - lastDay.getDay() - 1 + dayOffset) % DAYS_IN_WEEK));
  let current = new Date(firstDay);
  while (current <= lastDay) {
    yield [
      new Date(current),
      currentMonth % MONTHS_IN_YEAR === current.getMonth(),
      current.getDate() === today.getDate()
      && current.getMonth() === today.getMonth()
      && current.getFullYear() === today.getFullYear(),
    ] as [Date, boolean, boolean];
    const next = new Date(current);
    next.setDate(next.getDate() + 1);
    current = next;
  }
}

const days = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

interface CalendarProps extends React.ComponentPropsWithoutRef<'div'> {
  events: Event[]
  monthOffset?: number
  displayContent?: boolean
}

export default function Calendar({
  events,
  monthOffset = 0,
  displayContent = false,
}: CalendarProps) {
  const eventsByDate = groupBy(events, (item) => toIsoDate(item.date));

  return (
    <div>
      <div className="grid grid-cols-7">
        {days.map((day) => <div key={day} className="font-bold uppercase text-center">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
        {Array.from(generator(monthOffset)).map(([day, isCurrentMonth, isToday]) => (
          <Tooltip
            key={day.getTime()}
            content={
              eventsByDate.get(toIsoDate(day))?.map((event) => (
                <div key={event.id} className="py-1">
                  <div className="font-bold">{event.title}</div>
                  <div className="1">{event.description ? event.description : 'Pas de description'}</div>
                </div>
              ))
            }
            as="div"
          >
            <div
              className={`bg-white aspect-square flex flex-col items-center p-1 ${isCurrentMonth ? '' : 'opacity-50'}`}
            >
              <div className={`inline-flex justify-center items-center h-8 w-8 m-1 rounded-full ${isToday ? ' bg-pourpre-400 text-white' : ''} ${eventsByDate.get(toIsoDate(day))?.length ? 'border border-pourpre-400' : ''}`}>
                {day.getDate()}
              </div>
              {displayContent && (
                <div className="hidden md:block w-full">
                  {eventsByDate.get(toIsoDate(day))?.slice(0, MAX_VISIBLE_EVENTS).map(
                    (event) => (
                      <Badge key={event.id} variant={EventCategories[event.category]?.variant ?? 'default'} className="block mb-px rounded-sm truncate text-ellipsis w-full">
                        {event.title}
                      </Badge>
                    ),
                  )}
                  <div className="pl-2 pt-1 text-sm">
                    {eventsByDate.get(toIsoDate(day))?.slice(MAX_VISIBLE_EVENTS).length ? '+1' : ''}
                  </div>
                </div>
              )}
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
