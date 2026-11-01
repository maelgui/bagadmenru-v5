import type { Event, FileHit, Profile } from 'bagad-client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Spinner } from '@/components/ui/spinner';
import EventCategories from '../../utils/event-category';
import { fileAspect } from '../../utils/file-aspect';
import { fileViewUrl, isViewable } from '../../utils/file-urls';
import { pageTitle, type SearchablePage } from './pages';
import { MIN_QUERY_LENGTH, useGlobalSearch } from './use-global-search';

export const SEARCH_PLACEHOLDER = 'Pages, évènements, membres, fichiers…';

function PageItem({ page, onSelect }: { page: SearchablePage; onSelect: () => void }) {
  const Icon = page.icon;
  return (
    <CommandItem value={`page:${page.to}`} onSelect={onSelect}>
      <Icon className="text-muted-foreground" aria-hidden="true" />
      <span className="truncate">{pageTitle(page)}</span>
    </CommandItem>
  );
}

function EventItem({ event, onSelect }: { event: Event; onSelect: () => void }) {
  const category = EventCategories[event.category];
  return (
    <CommandItem value={`event:${event.id}`} onSelect={onSelect} className="items-start">
      <span className="flex w-11 shrink-0 flex-col items-center leading-none">
        <span className="font-heading text-base">{event.date.getDate()}</span>
        <span className="text-[10px] text-muted-foreground">
          {event.date.toLocaleString('fr', { month: 'short', year: '2-digit' })}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{event.title}</span>
        {event.description ? (
          <span className="truncate text-xs font-normal text-muted-foreground">{event.description}</span>
        ) : null}
      </span>
      <Badge variant={category?.variant ?? 'default'} className={category?.className}>
        {category?.name ?? event.category}
      </Badge>
    </CommandItem>
  );
}

function ProfileItem({ profile, onSelect }: { profile: Profile; onSelect: () => void }) {
  return (
    <CommandItem value={`profile:${profile.id}`} onSelect={onSelect}>
      <Avatar size="sm" className="border-2" style={{ borderColor: profile.instrument?.color ?? '' }}>
        <AvatarImage src={profile.pictureUrl ?? undefined} alt="" />
        <AvatarFallback className="text-[10px]">{`${profile.firstName[0]}${profile.lastName[0]}`}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{`${profile.firstName} ${profile.lastName}`}</span>
        {profile.instrument ? (
          <span className="truncate text-xs font-normal text-muted-foreground">{profile.instrument.name}</span>
        ) : null}
      </span>
    </CommandItem>
  );
}

function FileHitItem({ hit, onSelect }: { hit: FileHit; onSelect: () => void }) {
  const aspect = fileAspect(hit.file);
  const Icon = aspect.icon;
  return (
    <CommandItem value={`file:${hit.file.id}`} onSelect={onSelect}>
      <Icon className={aspect.color} aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{hit.file.name}</span>
        <span className="truncate text-xs font-normal text-muted-foreground">
          {['Fichiers', ...hit.path].join(' / ')}
        </span>
      </span>
    </CommandItem>
  );
}

function EmptyState({ query, isSearching }: { query: string; isSearching: boolean }) {
  if (query.length < MIN_QUERY_LENGTH) {
    return <CommandEmpty>Tapez au moins deux caractères pour rechercher.</CommandEmpty>;
  }
  if (isSearching) {
    return (
      <CommandEmpty>
        <span className="inline-flex items-center gap-2"><Spinner className="size-4" /> Recherche…</span>
      </CommandEmpty>
    );
  }
  return <CommandEmpty>{`Aucun résultat pour « ${query} »`}</CommandEmpty>;
}

// Mounted only while the dialog is open, so the query resets on every opening.
function SearchPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const {
    pages, events, profiles, files, isSearching,
  } = useGlobalSearch(query);

  const goTo = (to: string) => {
    onClose();
    void navigate(to);
  };

  const openFile = (hit: FileHit) => {
    if (isViewable(hit.file)) {
      window.open(fileViewUrl(hit.file.id), '_blank', 'noopener,noreferrer');
      onClose();
      return;
    }
    goTo(`/files/${hit.file.id}`);
  };

  const hasResults = pages.length + events.length + profiles.length + files.length > 0;

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={SEARCH_PLACEHOLDER}
        value={query}
        onValueChange={setQuery}
        aria-label="Rechercher"
      />
      <CommandList>
        {hasResults ? null : <EmptyState query={query.trim()} isSearching={isSearching} />}
        {pages.length > 0 ? (
          <CommandGroup heading="Pages">
            {pages.map((page) => <PageItem key={page.to} page={page} onSelect={() => goTo(page.to)} />)}
          </CommandGroup>
        ) : null}
        {events.length > 0 ? (
          <CommandGroup heading="Évènements">
            {events.map((event) => <EventItem key={event.id} event={event} onSelect={() => goTo(`/events/${event.id}`)} />)}
          </CommandGroup>
        ) : null}
        {profiles.length > 0 ? (
          <CommandGroup heading="Membres">
            {profiles.map((profile) => <ProfileItem key={profile.id} profile={profile} onSelect={() => goTo(`/profile/${profile.id}`)} />)}
          </CommandGroup>
        ) : null}
        {files.length > 0 ? (
          <CommandGroup heading="Fichiers">
            {files.map((hit) => <FileHitItem key={hit.file.id} hit={hit} onSelect={() => openFile(hit)} />)}
          </CommandGroup>
        ) : null}
      </CommandList>
    </Command>
  );
}

export default function GlobalSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Recherche"
      description="Rechercher une page, un évènement, un membre ou un fichier"
    >
      <SearchPalette onClose={() => onOpenChange(false)} />
    </CommandDialog>
  );
}
