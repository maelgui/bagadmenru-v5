// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

const listRoles = vi.fn().mockResolvedValue([]);

vi.mock('../../../config/client', () => ({
  useApiClient: () => ({
    usersApi: { listRolesApiV1RolesGet: listRoles },
  }),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import GroupForm from './groupForm';

function renderForm(onSubmit: (data: unknown) => unknown) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GroupForm onSubmit={onSubmit} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('GroupForm', () => {
  // Regression: the group add/edit pages used a fire-and-forget mutate() and
  // this form never even read isSubmitting, so the submit button stayed live
  // for the whole request and a slow network allowed a double POST creating
  // two groups. The pages now await mutateAsync and the button is gated.
  it('disables the submit button while an async onSubmit is pending', async () => {
    const user = userEvent.setup();
    const { promise, resolve: resolveSubmit } = Promise.withResolvers<undefined>();
    const onSubmit = vi.fn().mockImplementation(async () => await promise);
    renderForm(onSubmit);

    await user.type(screen.getByLabelText('Nom'), 'Bombardes');

    const button = screen.getByRole('button', { name: 'Enregistrer' });
    await user.click(button);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(button.hasAttribute('disabled')).toBe(true);

    resolveSubmit(undefined);
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
  });

  it('does not submit when the required name is missing', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(screen.getAllByText('Ce champ est obligatoire.').length).toBeGreaterThan(0));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
