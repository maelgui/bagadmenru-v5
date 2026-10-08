// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

const h = vi.hoisted(() => ({
  container: {
    id: 42,
    type: 'CONTAINER',
    name: 'Suite.mscz',
    processingStatus: 'processing',
  },
  state: { children: [] as unknown[] },
}));

const getFile = vi.fn(async () => await Promise.resolve({ ...h.container }));
const listChildren = vi.fn(async () => await Promise.resolve(h.state.children));
const getBreadcrumb = vi.fn(async () => await Promise.resolve([{ id: 42, name: 'Suite.mscz' }]));

vi.mock('../../config/client', () => ({
  queryClient: {},
  useApiClient: () => ({
    filesApi: {
      getFileApiV1FilesFileIdGet: getFile,
      listChildrenApiV1FilesFolderIdChildrenGet: listChildren,
      getBreadcrumbApiV1FilesFileIdBreadcrumbGet: getBreadcrumb,
    },
  }),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import { useFolder } from './list';

let client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useFolder: conversion completion refreshes children', () => {
  afterEach(() => {
    cleanup();
    h.state.children = [];
    h.container.processingStatus = 'processing';
    vi.clearAllMocks();
  });

  // The container polls on its own (refetchInterval). When the conversion
  // finishes, the folder query flips processingStatus to "completed" WITHOUT
  // any manual invalidation of the children query. The children must still
  // refetch and reveal the freshly generated PDFs. This is the exact bug: the
  // old code keyed children on the id alone, so the flip never refetched them.
  it('reveals the PDFs after the polled status flips to completed, with no manual refetch', async () => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useFolder('42'), { wrapper });

    await waitFor(() => expect(result.current.children).toEqual({ folders: [], files: [] }));

    // Simulate the backend completing between two polls: next folder fetch
    // returns completed and the PDFs now exist. No invalidateQueries here.
    h.container.processingStatus = 'completed';
    h.state.children = [{ id: 1, type: 'FILE', name: 'Conducteur.pdf' }];

    await waitFor(
      () => expect(result.current.children?.files).toHaveLength(1),
      { timeout: 5000 },
    );
    expect(result.current.children?.files[0].name).toBe('Conducteur.pdf');
  });
});
