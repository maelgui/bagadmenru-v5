import { useLoaderData } from 'react-router-dom';
import { Event } from '../client';

export default function EventsPage() {
  const data = useLoaderData() as Array<Event>;
  return (
    <div>
      {data.map((event) => (
        <div key={event.id} className="p-4 m-4 rounded-lg shadow-md ">
          <h2 className=" text-xl ">{event.title}</h2>
          <span>{event.description}</span>
          <div className="flex -space-x-2">
            <div className="inline-block h-16 w-16 rounded-full ring-4 ring-emerald-500 overflow-hidden bg-white"><img src="https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" /></div>
            <div className="inline-block h-16 w-16 rounded-full ring-4 ring-emerald-500 overflow-hidden bg-white"><img src="https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" /></div>
            <div className="inline-block h-16 w-16 rounded-full ring-4 ring-red-500 overflow-hidden bg-white"><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80" alt="" /></div>
            <div className="inline-block h-16 w-16 rounded-full ring-4 ring-white overflow-hidden bg-white"><img className="grayscale contrast-50" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" /></div>
            <div className="inline-block h-16 w-16 rounded-full ring-4 ring-white overflow-hidden bg-white"><img className="grayscale opacity-25" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80" alt="" /></div>
          </div>
          <hr />
          <div className="text-center">
            <h3 className="text-lg">Serez-vous présent ?</h3>
            <button type="button" className="mx-2 my-1 px-3 py-1 border-4 border-pourpre-500 bg-pourpre-500 text-white uppercase">Oui !</button>
            <button type="button" className="mx-2 my-1 px-3 py-1 border-4 border-pourpre-500 uppercase">Non :&apos;(</button>
          </div>
        </div>
      ))}
    </div>
  );
}
