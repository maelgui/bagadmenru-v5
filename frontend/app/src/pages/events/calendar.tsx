import { faCalendarCheck } from '@fortawesome/free-regular-svg-icons';
import { faCalendarDay, faCalendarPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../../components/alert';
import Button from '../../components/button';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions } from '../../config/client';
import groupBy from '../../utils/groupby';
import Calendar from './components/calendar';
import EventListItem from './components/event';

export default function CalendarPage() {
  const { eventsApi } = useApiClient();
  const { can } = usePermissions();

  const { data } = useQuery({
    queryKey: ['events', 'next100'],
    queryFn: () => eventsApi.listEventsApiV1EventsGet({ limit: 100, dateGte: new Date() }),
    select: (res) => ({
      events: res,
      eventsByMonth: groupBy(res, (item) => item.date.getMonth()),
    }),
  });

  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();

  const currentMonth = (new Date(today.getFullYear(), today.getMonth() + monthOffset)).toLocaleString('fr', { month: 'long', year: 'numeric' });

  return (
    <>
      <Header
        title="Calendrier"
        subtitle={currentMonth}
        actions={[
          <Header.Action variant="outline" key="add-event" as={Link} to="/events/manage" className={can('update', 'event') ? '' : 'hidden'}>
            <FontAwesomeIcon icon={faCalendarPlus} />
            {' '}
            Gérer
          </Header.Action>,
          <Header.Action key="doodle-nav" as={Link} to="/events" className={can('create', 'response') ? '' : 'hidden'}>
            <FontAwesomeIcon icon={faCalendarCheck} />
            {' '}
            Mes Présences
          </Header.Action>,
        ]}
        breadcrumb={[
          { title: 'Évènements', link: '/events' },
          { title: 'Calendrier' },
        ]}

      />
      <Container>
        {!data?.events.length ? (
          <Alert type="warning">Aucun évèvement prochainement.</Alert>
        ) : null}
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="basis-2/3">
            <div className="flex justify-between items-center">
              <div>
                <Button variant="outline" onClick={() => setMonthOffset(monthOffset - 1)}>précédent</Button>
                <Button variant="outline" onClick={() => setMonthOffset(0)} aria-label="Aujourd'hui" title="Aujourd'hui">
                  <FontAwesomeIcon icon={faCalendarDay} />
                </Button>
                <Button variant="outline" onClick={() => setMonthOffset(monthOffset + 1)}>suivant</Button>
              </div>
              <div className="text-gray-700 uppercase font-semibold">
                {currentMonth}
              </div>
            </div>

            <Calendar events={data?.events ?? []} monthOffset={monthOffset} displayContent />

          </div>
          <div className="basis-1/3">
            <div>
              {data && !data.events.length ? (<Alert type="info">Aucun évènement à venir.</Alert>) : null}
              {Array.from(data?.eventsByMonth ?? []).map(([month, events]) => (
                <div key={month} className="mb-4">
                  <h3 className="capitalize font-bold text-center">{(new Date(today.getFullYear(), month)).toLocaleString('fr', { month: 'long' })}</h3>
                  {events.map((event) => (
                    <div className="mb-5 mt-2" key={event.id}>
                      <EventListItem
                        event={event}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
