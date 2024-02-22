import {
  faCircleCheck, faCircleQuestion, faCircleXmark
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Costume, Event } from 'bagad-client';
import costume from '../../../assets/costume.svg';
import polo from '../../../assets/polo.svg';

interface EventListItemProps extends React.ComponentPropsWithoutRef<'div'> {
  event: Event
  response?: boolean
  showResponse?: boolean
}

export default function EventListItem({
  event, response = undefined, showResponse = false, className = '',
}: EventListItemProps) {
  return (
    <div className={`flex items-center ${response !== undefined && !response ? 'opacity-50' : ''} relative ${className}`}>
      <div>
        <div className="flex flex-col justify-center text-center mr-4 my-2 px-4 border-r-2 h-16 w-24 border-pourpre-400">
          <span className="text-xl font-bold">{event.date.getDate()}</span>
          <span className="text-sm truncate">{event.date.toLocaleString('fr', { month: 'long' })}</span>
        </div>

      </div>
      <div className="overflow-hidden">
        <div className="truncate">{event.title}</div>
        <div className="text-sm truncate">{event.description}</div>
        <div className="ml-auto flex">
          {showResponse ? (
            <div className="w-6 h-6 flex items-center justify-center">
              {(() => {
                if (response === undefined) {
                  return (
                    <FontAwesomeIcon icon={faCircleQuestion} className="text-sky-300" />
                  );
                }
                if (response) {
                  return (
                    <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-300" />
                  );
                }

                return (
                  <FontAwesomeIcon icon={faCircleXmark} className="text-red-300" />
                );
              })()}
            </div>
          ) : null}
          {event.costume !== Costume.None ? (
            <div className="w-6 h-6 flex items-center justify-center">
              {event.costume === Costume.Costume ? <img src={costume} alt="En Costume" className="w-5 h-5" /> : null}
              {event.costume === Costume.Polo ? <img src={polo} alt="En Polo" className="w-5 h-5" /> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
