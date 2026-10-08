import { ResponseError } from 'bagad-client';
import { useCallback, useRef, useState } from 'react';
import { useApiClient } from '../../config/client';

export type UploadItemStatus =
  | 'uploading'
  | 'conflict'
  | 'done'
  | 'error'
  | 'skipped';

export interface UploadItem {
  id: string;
  file: File;
  status: UploadItemStatus;
}

const MAX_CONCURRENT_UPLOADS = 4;
const HTTP_CONFLICT = 409;

async function runWithConcurrency(
  tasks: Array<() => Promise<void>>,
  limit: number,
): Promise<void> {
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor += 1;
      await tasks[index]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

export function useBatchUpload(folderId: number | undefined, onComplete: () => void) {
  const { filesApi } = useApiClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [active, setActive] = useState(false);
  const itemsRef = useRef<UploadItem[]>([]);

  const patch = useCallback((id: string, status: UploadItemStatus) => {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, status } : item));
      itemsRef.current = next;
      return next;
    });
  }, []);

  const uploadOne = useCallback(async (item: UploadItem, force: boolean) => {
    if (folderId === undefined) return;
    patch(item.id, 'uploading');
    try {
      await filesApi.uploadFileApiV1FilesFolderIdUploadPost({ folderId, file: item.file, force });
      patch(item.id, 'done');
    } catch (err) {
      if (err instanceof ResponseError && err.response.status === HTTP_CONFLICT) {
        patch(item.id, 'conflict');
      } else {
        patch(item.id, 'error');
      }
    }
  }, [filesApi, folderId, patch]);

  const start = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const initial: UploadItem[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file,
      status: 'uploading',
    }));
    itemsRef.current = initial;
    setItems(initial);
    setActive(true);
    await runWithConcurrency(
      initial.map((item) => async () => { await uploadOne(item, false); }),
      MAX_CONCURRENT_UPLOADS,
    );
    onComplete();
  }, [onComplete, uploadOne]);

  const resolveConflict = useCallback(async (id: string, overwrite: boolean) => {
    const item = itemsRef.current.find((candidate) => candidate.id === id);
    if (!item) return;
    if (!overwrite) {
      patch(id, 'skipped');
      return;
    }
    await uploadOne(item, true);
    onComplete();
  }, [onComplete, patch, uploadOne]);

  const close = useCallback(() => {
    setActive(false);
    setItems([]);
    itemsRef.current = [];
  }, []);

  return { items, active, start, resolveConflict, close };
}
