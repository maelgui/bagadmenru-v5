import moment from 'moment';
import { useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { Configuration, Event, EventsApi } from '../../client2';
import Tooltip from '../../components/tooltip';
import groupBy from '../../utils/groupby';

moment.locale('fr');
function* generator(monthOffset: number, dayOffset = 1) {
  const today = new Date();
  const currentMonth = today.getMonth() + monthOffset;
  const firstDay = new Date(today.getFullYear(), currentMonth, 1);
  const lastDay = new Date(today.getFullYear(), currentMonth + 1, 0);
  firstDay.setDate(firstDay.getDate() - ((firstDay.getDay() - dayOffset + 7) % 7));
  lastDay.setDate(lastDay.getDate() + ((7 - lastDay.getDay() - 1 + dayOffset) % 7));
  while (firstDay <= lastDay) {
    yield [
      new Date(firstDay),
      currentMonth % 12 === firstDay.getMonth(),
      firstDay.getDate() === today.getDate()
      && firstDay.getMonth() === today.getMonth()
      && firstDay.getFullYear() === today.getFullYear(),
    ] as [Date, boolean, boolean];
    firstDay.setDate(firstDay.getDate() + 1);
  }
}

const days = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

interface EventsData {
  eventsByMonth: Map<number, Event[]>
  eventsByDate: Map<string, Event[]>
}

export async function eventsLoader(): Promise<EventsData> {
  const api = new EventsApi(new Configuration({ basePath: import.meta.env.VITE_BBE2_API_URL }));
  const events = await api.listEventsApiV1EventsGet();
  return {
    eventsByMonth: groupBy(events, (item) => item.date.getMonth()),
    eventsByDate: groupBy(events, (item) => item.date.toLocaleDateString()),
  };
}
export default function CalendarPage() {
  const { eventsByMonth, eventsByDate } = useLoaderData() as EventsData;
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();

  return (
    <>
      <h1 className="text-xl">Calendrier</h1>
      <h3 className="text-lg">{(new Date(today.getFullYear(), today.getMonth() + monthOffset)).toLocaleString('fr', { month: 'long' })}</h3>
      <button type="button" onClick={() => setMonthOffset(monthOffset - 1)}>Mois précédent</button>
      <button type="button" onClick={() => setMonthOffset(monthOffset + 1)}>Mois suivant</button>
      <button type="button" onClick={() => setMonthOffset(0)}>Reset</button>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="basis-2/3">
          <div className="grid grid-cols-7">
            {days.map((day) => <div key={day} className="font-bold uppercase text-center">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
            {Array.from(generator(monthOffset)).map(([day, isCurrentMonth, isToday]) => (
              <Tooltip
                key={day.getTime()}
                content={
                  eventsByDate.get(day.toLocaleDateString())?.map((event) => (
                    <span key={event.id} className="block">{event.title}</span>
                  ))
                }
                as="div"
              >
                <div
                  className={`bg-white md:h-24 flex flex-col items-center p-1 ${isCurrentMonth ? '' : 'opacity-50'}`}
                >
                  <span className={`inline-flex justify-center items-center h-8 w-8 m-1 rounded-full ${isToday ? ' bg-pourpre-400 text-white' : ''} ${eventsByDate.get(day.toLocaleDateString())?.length ? 'border border-pourpre-400' : ''}`}>
                    {day.getDate()}
                  </span>
                  {eventsByDate.get(day.toLocaleDateString())?.map((event) => (
                    <span key={event.id} className="hidden md:block rounded-sm truncate border border-pourpre-400 text-sm p-1 w-full">{event.title}</span>
                  ))}
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="basis-1/3">
          <h3 className="text-lg">Prochains évènements</h3>
          <div>
            {Array.from(eventsByMonth).map(([month, events]) => (
              <div key={month} className="mb-4">
                <h3 className="capitalize font-bold">{(new Date(today.getFullYear(), month)).toLocaleString('fr', { month: 'long' })}</h3>
                {events.map((event) => (
                  <div key={event.id} className="flex items-center">
                    <div>
                      <div className="flex flex-col justify-center text-center mx-4 my-2 border-r-2 h-16 w-16 border-pourpre-400">
                        <span className="text-xl font-bold">{event.date.getDate()}</span>
                        <span className="text-sm">{event.date.toLocaleString('fr', { month: 'long' })}</span>
                      </div>

                    </div>
                    <div>
                      <div>{event.title}</div>
                      <div className="text-sm">{event.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
