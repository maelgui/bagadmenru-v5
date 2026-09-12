// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup, fireEvent, render, screen,
} from '@testing-library/react';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

const createMyApiKey = vi.fn().mockResolvedValue({ key: 'secret-key-123' });

vi.mock('../../../config/client', () => ({
  useApiClient: () => ({
    usersApi: { createMyApiKeyApiV1ProfilesMeApiKeysPost: createMyApiKey },
  }),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import IcsExportButton from './ics-export';

function renderButton() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <IcsExportButton />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('IcsExportButton', () => {
  it('opens the calendar sync dialog and mints a personal link', async () => {
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: /Synchroniser/ }));

    expect(screen.getByRole('heading', { name: 'Ajouter à mon agenda' })).toBeDefined();

    // Once minted, the personal ICS link shows up in the read-only field...
    const field = await screen.findByRole<HTMLInputElement>('textbox', { name: 'Lien du calendrier' });
    expect(field.value).toContain('/api/v1/events/export/ics/me?api_key=secret-key-123');
    expect(createMyApiKey).toHaveBeenCalledWith({
      apiKeyCreate: { label: 'Calendrier', authorizedPermissions: ['view:calendar'] },
    });

    // ...and the Google Agenda shortcut points at the encoded webcal feed.
    const google = screen.getByRole('link', { name: /Google Agenda/ });
    const href = google.getAttribute('href') ?? '';
    expect(href).toContain('https://calendar.google.com/calendar/render?cid=');
    expect(href).toContain(encodeURIComponent('webcal://'));
    expect(href).toContain(encodeURIComponent('api_key=secret-key-123'));
  });
});
