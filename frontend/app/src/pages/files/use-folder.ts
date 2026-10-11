import { useQuery } from '@tanstack/react-query';
import { type FileOrFolder, FileOrFolderType } from 'bagad-client';
import { useApiClient } from '../../config/client';

const CONVERSION_POLL_INTERVAL_MS = 2000;

function isConverting(node?: FileOrFolder): boolean {
  return node?.type === FileOrFolderType.Container
    && node.processingStatus != null
    && node.processingStatus !== 'completed'
    && node.processingStatus !== 'failed';
}

export function useFolder(folderId?: number) {
  const { filesApi } = useApiClient();
  const { data: folder } = useQuery({
    queryKey: ['files', folderId ?? 'root'],
    queryFn: async () => (
      folderId === undefined
        ? await filesApi.getRootApiV1FilesRootGet()
        : await filesApi.getFileApiV1FilesFileIdGet({ fileId: folderId })
    ),
    refetchInterval: (query) => (isConverting(query.state.data) ? CONVERSION_POLL_INTERVAL_MS : false),
  });
  const converting = isConverting(folder);
  const { data: children, status } = useQuery({
    queryKey: ['files', folder?.id, 'children', folder?.processingStatus],
    queryFn: async () => {
      if (!folder?.id) throw new Error('Invalid id');
      return await filesApi.listChildrenApiV1FilesFolderIdChildrenGet({ folderId: folder.id });
    },
    enabled: !!folder?.id,
    refetchInterval: converting ? CONVERSION_POLL_INTERVAL_MS : false,
  });
  const { data: breadcrumb } = useQuery({
    queryKey: ['files', folder?.id, 'breadcrumb'],
    queryFn: async () => {
      if (!folder?.id) throw new Error('Invalid id');
      return await filesApi.getBreadcrumbApiV1FilesFileIdBreadcrumbGet({ fileId: folder.id });
    },
    enabled: !!folder?.id,
  });
  return { folder, children, status, breadcrumb };
}
