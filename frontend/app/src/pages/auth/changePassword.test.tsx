// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { ResponseError } from 'bagad-client';

const resetPassword = vi.fn();

vi.mock('../../config/client', () => ({
  useApiClient: () => ({ authApi: { resetPasswordApiV1AuthResetPost: resetPassword } }),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import ChangePasswordPage from './changePassword';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/auth/reset/tok123']}>
      <Routes>
        <Route path="/auth/reset/:token" element={<ChangePasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillAndSubmit(password = 'nouveau-mdp', confirm = password) {
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirmation'), { target: { value: confirm } });
  fireEvent.click(screen.getByRole('button', { name: /Changer/ }));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ChangePasswordPage', () => {
  it('shows the success screen when the reset succeeds', async () => {
    resetPassword.mockResolvedValue(undefined);
    renderPage();
    fillAndSubmit();
    expect(await screen.findByText(/Mot de passe changé avec succès/)).toBeTruthy();
  });

  it('surfaces a rejected token instead of failing silently', async () => {
    // Regression: an expired/used token used to produce no feedback at all.
    resetPassword.mockRejectedValue(
      new ResponseError(new Response('{}', { status: 403 })),
    );
    renderPage();
    fillAndSubmit();
    expect(await screen.findByText(/invalide, a expiré ou a déjà été utilisé/)).toBeTruthy();
    // The dead link is not retryable: guide the user to request a fresh one.
    expect(screen.getByRole('link', { name: /Demander un nouveau lien/ })).toBeTruthy();
    // And the success screen must not appear.
    expect(screen.queryByText(/succès/)).toBeNull();
  });

  it('shows a generic message on other errors', async () => {
    resetPassword.mockRejectedValue(new Error('network down'));
    renderPage();
    fillAndSubmit();
    expect(await screen.findByText(/Une erreur est survenue/)).toBeTruthy();
  });

  it('rejects mismatched passwords before calling the API', async () => {
    renderPage();
    fillAndSubmit('nouveau-mdp', 'autre-mdp');
    expect(await screen.findByText(/ne correspondent pas/)).toBeTruthy();
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
