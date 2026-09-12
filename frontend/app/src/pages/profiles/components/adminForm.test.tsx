// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

const listGroups = vi.fn().mockResolvedValue([]);
const listInstruments = vi.fn().mockResolvedValue([
  { id: 1, name: 'Bombarde', color: '#fff' },
]);

vi.mock('../../../config/client', () => ({
  useApiClient: () => ({
    usersApi: { listGroupsApiV1GroupsGet: listGroups },
    instrumentsApi: { listInstrumentsApiV1InstrumentsGet: listInstruments },
  }),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import AdminEditProfileForm from './adminForm';

function renderForm(onSubmit: (data: unknown) => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminEditProfileForm onSubmit={onSubmit} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminEditProfileForm (creation)', () => {
  // Regression: the creation form used to leave receivesEmails undefined, so
  // the switch rendered off and the field was dropped from the JSON payload,
  // making POST /profiles fail with a 422 when the admin never touched it.
  it('defaults the notification switches to on', async () => {
    renderForm(vi.fn());

    const emailSwitch = await screen.findByRole('switch', { name: /Notifications par email/ });
    expect(emailSwitch.getAttribute('aria-checked')).toBe('true');
  });

  it('submits receivesEmails and receivesPush as true when left untouched', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    await user.type(screen.getByLabelText('Prénom'), 'New');
    await user.type(screen.getByLabelText('Nom'), 'Member');
    await user.type(screen.getByLabelText('E-mail'), 'new.member@example.com');

    // Pick the instrument through the combobox (required by the backend).
    const instrumentInput = await screen.findByRole('combobox', { name: 'Instrument' });
    await user.click(instrumentInput);
    await user.type(instrumentInput, 'Bomb');
    await user.click(await screen.findByRole('option', { name: 'Bombarde' }));

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      firstName: 'New',
      lastName: 'Member',
      email: 'new.member@example.com',
      instrumentId: 1,
      receivesEmails: true,
      receivesPush: true,
    });
  });

  it('shows an inline error instead of submitting when no instrument is picked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    await user.type(screen.getByLabelText('Prénom'), 'New');
    await user.type(screen.getByLabelText('Nom'), 'Member');
    await user.type(screen.getByLabelText('E-mail'), 'new.member@example.com');

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(screen.getAllByText('Ce champ est obligatoire.').length).toBeGreaterThan(0));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
