import { faCalendar, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../../components/alert';
import Button from '../../components/button';
import Header from '../../components/header';
import Tooltip from '../../components/tooltip';
import { eventsApi } from '../../config/client';
import groupBy from '../../utils/groupby';

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

export default function CalendarPage() {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.listEventsApiV1EventsGet(),
    select: (res) => ({
      events: res,
      eventsByMonth: groupBy(res, (item) => item.date.getMonth()),
      eventsByDate: groupBy(res, (item) => item.date.toLocaleDateString()),
    }),
  });

  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();

  return (
    <>
      <Header
        title="Calendrier"
        subtitle={(new Date(today.getFullYear(), today.getMonth() + monthOffset)).toLocaleString('fr', { month: 'long', year: 'numeric' })}
        actions={[
          <Header.Action outline key="add-event" onClick={() => navigate('/events/add')}>
            <FontAwesomeIcon icon={faPlusCircle} />
            {' '}
            Ajouter
          </Header.Action>,
          <Header.Action key="doodle-nav" onClick={() => navigate('/events/doodle')}>
            <FontAwesomeIcon icon={faCalendar} />
            {' '}
            Mes Présences
          </Header.Action>,
        ]}
      />
      {!data?.events ? (
        <Alert type="warning">Aucun évèvement prochainement.</Alert>
      ) : null}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="basis-3/4">
          <div className="flex justify-between items-center">
            <div>
              <Button outline onClick={() => setMonthOffset(monthOffset - 1)}>précédent</Button>
              <Button outline onClick={() => setMonthOffset(monthOffset + 1)}>suivant</Button>
            </div>
            <div>
              <Button size="sm" outline onClick={() => setMonthOffset(0)}>Reset</Button>

            </div>
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => <div key={day} className="font-bold uppercase text-center">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
            {Array.from(generator(monthOffset)).map(([day, isCurrentMonth, isToday]) => (
              <Tooltip
                key={day.getTime()}
                content={
                  data?.eventsByDate.get(day.toLocaleDateString())?.map((event) => (
                    <div key={event.id} className="py-1">
                      <div className="font-bold">{event.title}</div>
                      <div className="1">{event.description ? event.description : 'Pas de description'}</div>
                    </div>
                  ))
                }
                as="div"
              >
                <div
                  className={`bg-white md:h-32 flex flex-col items-center p-1 ${isCurrentMonth ? '' : 'opacity-50'}`}
                >
                  <div className={`inline-flex justify-center items-center h-8 w-8 m-1 rounded-full ${isToday ? ' bg-pourpre-400 text-white' : ''} ${data?.eventsByDate.get(day.toLocaleDateString())?.length ? 'border border-pourpre-400' : ''}`}>
                    {day.getDate()}
                  </div>
                  <div className="hidden md:block w-full">
                    {data?.eventsByDate.get(day.toLocaleDateString())?.slice(0, 2).map((event) => (
                      <div key={event.id} className="border border-pourpre-400 rounded-sm truncate text-xs p-1 mb-px">{event.title}</div>
                    ))}
                    <div className="pl-2 pt-1 text-sm">
                      {data?.eventsByDate.get(day.toLocaleDateString())?.slice(2).length ? '+1' : ''}
                    </div>
                  </div>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="basis-1/4">
          <div>
            {Array.from(data?.eventsByMonth ?? []).map(([month, events]) => (
              <div key={month} className="mb-4">
                <h3 className="capitalize font-bold text-center">{(new Date(today.getFullYear(), month)).toLocaleString('fr', { month: 'long' })}</h3>
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
