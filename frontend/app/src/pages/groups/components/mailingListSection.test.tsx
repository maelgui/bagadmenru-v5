// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Group, MailingListPreview } from 'bagad-client';
import {
  cleanup, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

const preview = vi.fn();
const sync = vi.fn();

vi.mock('../../../config/client', async () => {
  const actual = await vi.importActual('../../../config/client');
  return {
    ...actual,
    useApiClient: () => ({
      usersApi: {
        previewMailingListApiV1GroupsGroupIdMailingListPreviewGet: preview,
        syncMailingListApiV1GroupsGroupIdMailingListSyncPost: sync,
      },
    }),
    usePermissions: () => ({ can: () => true, permissions: [] }),
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: { add: vi.fn() },
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import MailingListSection from './mailingListSection';

const group: Group = {
  id: 7,
  name: 'Bombardes',
  color: '#932a58',
  isInstrument: false,
  mailingList: 'bombardes',
  mailingListSyncedAt: null,
  mailingListSyncError: null,
  roles: [],
  members: [],
};

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MailingListSection group={group} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const diff: MailingListPreview = {
  configured: true,
  inSync: false,
  subscribers: ['old@bagadmenru.bzh'],
  expected: ['new@bagadmenru.bzh'],
  toAdd: ['new@bagadmenru.bzh'],
  toRemove: ['old@bagadmenru.bzh'],
  syncedAt: null,
  error: null,
};

describe('MailingListSection', () => {
  it('renders the OVH diff (to add / to remove)', async () => {
    preview.mockResolvedValue(diff);
    renderSection();

    await waitFor(() => expect(screen.getByText('new@bagadmenru.bzh')).toBeTruthy());
    expect(screen.getByText(/1 à ajouter · 1 à retirer/)).toBeTruthy();
    expect(screen.getByText('old@bagadmenru.bzh')).toBeTruthy();
  });

  it('calls the sync endpoint when the button is clicked', async () => {
    const user = userEvent.setup();
    preview.mockResolvedValue(diff);
    sync.mockResolvedValue({ ...diff, inSync: true, toAdd: [], toRemove: [] });
    renderSection();

    const button = await screen.findByRole('button', { name: /Synchroniser maintenant/ });
    await user.click(button);

    await waitFor(() => expect(sync).toHaveBeenCalledWith({ groupId: 7 }));
  });

  it('shows an "unconfigured" message when OVH is not set up', async () => {
    preview.mockResolvedValue({
      configured: false,
      inSync: true,
      subscribers: [],
      expected: ['a@bagadmenru.bzh'],
      toAdd: [],
      toRemove: [],
      syncedAt: null,
      error: null,
    });
    renderSection();

    await waitFor(() => expect(screen.getByText(/identifiants OVH ne sont pas configurés/)).toBeTruthy());
  });
});
