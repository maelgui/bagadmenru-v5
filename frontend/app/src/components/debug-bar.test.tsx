// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup, fireEvent, render, screen,
} from '@testing-library/react';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

// Mock the API client so the panel renders without a backend. The module is
// imported dynamically per test (the environment gate is resolved at module
// load), so the mock must be registered before any import.
vi.mock('../config/client', () => ({
  ACTIVE_ACCOUNT_COOKIE: 'active_account',
  useApiClient: () => ({
    defaultApi: { versionApiV1VersionGet: async () => await Promise.resolve({ version: '1.2.3' }) },
    authApi: {
      listSessionsApiV1AuthSessionsGet: async () => await Promise.resolve([
        {
          id: 'abcdef1234567890', firstName: 'Jean', lastName: 'Test', active: true,
        },
        {
          id: '9876543210fedcba', firstName: 'Anna', lastName: 'Autre', active: false,
        },
      ]),
    },
    usersApi: { getMyPermissionsApiV1ProfilesMePermissionsGet: async () => await Promise.resolve(['read:events']) },
  }),
}));

/** Import a fresh copy of the component with the given runtime environment. */
async function loadDebugBar(environment?: string) {
  vi.resetModules();
  window.env = environment !== undefined ? { VITE_ENVIRONMENT: environment } : {};
  const { default: DebugBar } = await import('./debug-bar');
  return DebugBar;
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DebugBar environment gating', () => {
  it('renders nothing on production', async () => {
    const DebugBar = await loadDebugBar('production');
    renderWithQuery(<DebugBar />);
    expect(screen.queryByTestId('debug-bar-toggle')).toBeNull();
  });

  it('renders the collapsed pill on beta, named after the environment', async () => {
    const DebugBar = await loadDebugBar('beta');
    renderWithQuery(<DebugBar />);
    expect(screen.getByTestId('debug-bar-toggle').textContent).toContain('beta');
    // Collapsed: the panel (and its queries) must not be mounted.
    expect(screen.queryByTestId('debug-bar-panel')).toBeNull();
  });
});

describe('DebugBar panel', () => {
  it('opens on click and shows versions, API URL, sessions and permissions', async () => {
    const DebugBar = await loadDebugBar('beta');
    renderWithQuery(<DebugBar />);

    fireEvent.click(screen.getByTestId('debug-bar-toggle'));

    expect(await screen.findByTestId('debug-bar-panel')).toBeTruthy();
    expect(await screen.findByText('1.2.3')).toBeTruthy();
    expect(screen.getByTestId('debug-bar-api-url')).toBeTruthy();
    // Both sessions listed, active one flagged.
    expect(await screen.findByText(/Jean\s+Test/)).toBeTruthy();
    expect(screen.getByText(/Anna\s+Autre/)).toBeTruthy();
    expect(screen.getByText('active')).toBeTruthy();
    // Permissions fetched because an active session exists.
    expect(await screen.findByText('read:events')).toBeTruthy();
  });

  it('closes back to the pill', async () => {
    const DebugBar = await loadDebugBar('beta');
    renderWithQuery(<DebugBar />);

    fireEvent.click(screen.getByTestId('debug-bar-toggle'));
    fireEvent.click(await screen.findByTestId('debug-bar-close'));

    expect(screen.queryByTestId('debug-bar-panel')).toBeNull();
    expect(screen.getByTestId('debug-bar-toggle')).toBeTruthy();
  });
});
