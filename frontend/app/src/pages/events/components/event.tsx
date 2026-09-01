import { CircleCheck, CircleHelp, CircleX } from 'lucide-react';
import { Costume, type Event } from 'bagad-client';
import costume from '../../../assets/costume.svg';
import polo from '../../../assets/polo.svg';
import { Badge } from '@/components/ui/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import EventCategories from '../../../utils/event-category';

interface EventListItemProps {
  event: Event;
  response?: boolean;
  showResponse?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'muted';
}

function ResponseIndicator({ response }: { response?: boolean }) {
  let label = 'Sans réponse';
  if (response === true) label = 'Présent';
  if (response === false) label = 'Absent';
  return (
    <div className="flex size-6 items-center justify-center" title={label}>
      {response === undefined ? <CircleHelp className="text-sky-500" aria-label={label} /> : null}
      {response === true ? <CircleCheck className="text-emerald-500" aria-label={label} /> : null}
      {response === false ? <CircleX className="text-destructive" aria-label={label} /> : null}
    </div>
  );
}

function CostumeIndicator({ value }: { value: Costume }) {
  if (value === Costume.None) return null;
  const label = value === Costume.Costume ? 'En costume' : 'En polo';
  return (
    <div className="flex size-6 items-center justify-center" title={label}>
      <img src={value === Costume.Costume ? costume : polo} alt={label} className="size-5" />
    </div>
  );
}

function EventBadgeRow({ event, response, showResponse }: { event: Event; response?: boolean; showResponse: boolean }) {
  const category = EventCategories[event.category];
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Badge variant={category?.variant ?? 'default'} className={category?.className}>
        {category?.name ?? event.category}
      </Badge>
      {showResponse && event.isInDoodle ? <ResponseIndicator response={response} /> : null}
      <CostumeIndicator value={event.costume} />
    </div>
  );
}

export default function EventListItem({
  event, response = undefined, showResponse = false, className, variant = 'outline',
}: EventListItemProps) {
  const itemClassName = cn(response === false && 'opacity-60', className);

  return (
    <Item variant={variant} className={itemClassName}>
      <ItemMedia className="flex-col text-center">
        <span className="font-heading text-2xl leading-none">{event.date.getDate()}</span>
        <span className="text-sm text-muted-foreground">
          {event.date.toLocaleString('fr', { month: 'short' })}
        </span>
      </ItemMedia>
      <ItemContent>
        <ItemTitle title={event.title}>{event.title}</ItemTitle>
        <ItemDescription title={event.description}>{event.description}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <EventBadgeRow event={event} response={response} showResponse={showResponse} />
      </ItemActions>
    </Item>
  );
}

export function EventListItemSkeleton({ className, variant = 'outline' }: { className?: string; variant?: 'default' | 'outline' | 'muted' }) {
  return (
    <Item variant={variant} className={className}>
      <ItemMedia className="flex-col gap-1">
        <Skeleton className="size-6" />
        <Skeleton className="h-3 w-8" />
      </ItemMedia>
      <ItemContent>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </ItemContent>
      <ItemActions>
        <Skeleton className="h-5 w-16 rounded-full" />
      </ItemActions>
    </Item>
  );
}
