import { faCalendarCheck } from '@fortawesome/free-regular-svg-icons';
import { faCalendarPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../../components/alert';
import Button from '../../components/button';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';
import groupBy from '../../utils/groupby';
import Calendar from './components/calendar';
import EventListItem from './components/event';


export default function CalendarPage() {
  const { eventsApi } = useApiClient();

  const { data } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.listEventsApiV1EventsGet(),
    select: (res) => ({
      events: res,
      eventsByMonth: groupBy(res, (item) => item.date.getMonth()),
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
          <Header.Action variant="outline" key="add-event" as={Link} to="/events/manage">
            <FontAwesomeIcon icon={faCalendarPlus} />
            {' '}
            Gérer
          </Header.Action>,
          <Header.Action key="doodle-nav" as={Link} to="/events/doodle">
            <FontAwesomeIcon icon={faCalendarCheck} />
            {' '}
            Mes Présences
          </Header.Action>,
        ]}
        breadcrumb={[
          { title: 'Évènements', link: '/events/doodle' },
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
                <Button variant="outline" onClick={() => setMonthOffset(monthOffset + 1)}>suivant</Button>
              </div>
              <div>
                <Button size="sm" variant="outline" onClick={() => setMonthOffset(0)}>Reset</Button>
              </div>
            </div>

            <Calendar events={data?.events ?? []} monthOffset={monthOffset} displayContent={true} />

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
