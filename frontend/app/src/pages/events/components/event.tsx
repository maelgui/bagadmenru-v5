import { Event } from 'bagad-client';

export default function EventListItem({ event }: { event: Event }) {
  return (
    <div className="flex items-center">
      <div>
        <div className="flex flex-col justify-center text-center mx-4 my-2 border-r-2 h-16 w-16 border-pourpre-400">
          <span className="text-xl font-bold">{event.date.getDate()}</span>
          <span className="text-sm truncate">{event.date.toLocaleString('fr', { month: 'long' })}</span>
        </div>

      </div>
      <div>
        <div>{event.title}</div>
        <div className="text-sm">{event.description}</div>
      </div>
    </div>
  );
}
