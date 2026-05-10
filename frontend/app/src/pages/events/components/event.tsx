import {
  faCircleCheck, faCircleQuestion, faCircleXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Costume, type Event } from 'bagad-client';
import costume from '../../../assets/costume.svg';
import polo from '../../../assets/polo.svg';
import Badge from '../../../components/badge';
import { SkeletonText } from '../../../components/skeleton';
import EventCategories from '../../../utils/event-category';

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
        <div className="flex flex-col justify-center text-center mr-4 my-2 px-4 border-r-2 h-16 w-24 border-camelot-800">
          <span className="text-xl font-bold">{event.date.getDate()}</span>
          <span className="text-sm truncate">{event.date.toLocaleString('fr', { month: 'long' })}</span>
        </div>
      </div>
      <div className="overflow-hidden">
        <div className="truncate" title={event.title}>{event.title}</div>
        <div className="text-sm truncate" title={event.description}>{event.description}</div>
        <div className="ml-auto flex items-center">
          <div className="p-1">
            <Badge variant={EventCategories[event.category]?.variant ?? 'default'}>{EventCategories[event.category]?.name ?? event.category}</Badge>
          </div>
          {showResponse && event.isInDoodle ? (
            <div className="w-6 h-6 flex items-center justify-center">
              {(() => {
                if (response === undefined) {
                  return (
                    <FontAwesomeIcon icon={faCircleQuestion} className="text-sky-500" aria-hidden="true" />
                  );
                }
                if (response) {
                  return (
                    <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-300" aria-hidden="true" />
                  );
                }

                return (
                  <FontAwesomeIcon icon={faCircleXmark} className="text-red-300" aria-hidden="true" />
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

export function EventListItemSkeleton({
  className = '',
}: { className?: string }) {
  return (
    <div className={`flex items-center relative ${className}`}>
      <div>
        <div className="flex flex-col justify-center text-center mr-4 my-2 px-4 border-r-2 h-16 w-24 border-camelot-800">
          <span className="text-xl font-bold"><SkeletonText className="w-6 h-6" /></span>
          <span className="text-sm truncate"><SkeletonText className="w-8" /></span>
        </div>
      </div>
      <div className="overflow-hidden">
        <div className="truncate"><SkeletonText className="w-16" /></div>
        <div className="text-sm truncate"><SkeletonText className="w-48" /></div>
        <div className="ml-auto flex items-center">
          <div className="py-1">
            <SkeletonText className="w-16 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
