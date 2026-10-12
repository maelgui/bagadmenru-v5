import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../config/client';

export function useSuggestions(folderId?: number) {
  const { filesApi } = useApiClient();
  return useQuery({
    queryKey: ['files', 'suggestions', folderId ?? 'root'],
    queryFn: async () => await filesApi.listSuggestionsApiV1FilesSuggestionsGet({ folderId }),
  });
}
