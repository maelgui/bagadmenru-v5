import { useQuery } from '@tanstack/react-query';
import type { SearchResults } from 'bagad-client';
import { useEffect, useState } from 'react';
import { useApiClient, usePermissions } from '../../config/client';
import { matchPages, tokens } from './pages';

export const SEARCH_DEBOUNCE_MS = 200;
export const MIN_QUERY_LENGTH = 2;

const NO_RESULTS: SearchResults = { events: [], profiles: [], files: [] };

export function isLongEnough(query: string): boolean {
  return tokens(query).join(' ').length >= MIN_QUERY_LENGTH;
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useGlobalSearch(query: string) {
  const { searchApi } = useApiClient();
  const { can } = usePermissions();
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const enabled = isLongEnough(debounced);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: async () => await searchApi.searchApiV1SearchGet({ q: debounced }),
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const results = enabled && data ? data : NO_RESULTS;
  return {
    pages: isLongEnough(query) ? matchPages(query, can) : [],
    ...results,
    isSearching: enabled && (isFetching || debounced !== query.trim()),
  };
}
