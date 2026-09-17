// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

import VersionInfo from './version-info';

// Mock the API client so the component renders without a backend.
vi.mock('../config/client', () => ({
  useApiClient: () => ({
    defaultApi: { versionApiV1VersionGet: async () => await Promise.resolve({ version: '1.2.3' }) },
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('VersionInfo', () => {
  it('falls back to "dev" when VITE_APP_VERSION is not injected (dev server)', async () => {
    // Vitest does not define VITE_APP_VERSION, matching the compose dev
    // server where only the node-build image stage injects it. The backend
    // applies the same runtime fallback (APP_VERSION defaults to "dev").
    renderWithQuery(<VersionInfo />);

    expect(screen.getByText('Frontend dev')).toBeTruthy();
    expect(await screen.findByText('Backend 1.2.3')).toBeTruthy();
  });
});
