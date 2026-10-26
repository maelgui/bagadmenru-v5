import { useQuery } from '@tanstack/react-query';
import type { FileOrFolder } from 'bagad-client';
import { useApiClient } from '../../config/client';

export function useFileVersions(file?: FileOrFolder) {
  const { filesApi } = useApiClient();
  return useQuery({
    queryKey: ['files', file?.id, 'versions'],
    queryFn: async () => {
      if (!file) throw new Error('Invalid file');
      return await filesApi.listFileVersionsApiV1FilesFileIdVersionsGet({ fileId: file.id });
    },
    enabled: !!file?.currentVersion,
  });
}
