// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { ResponseError } from 'bagad-client';
import { snoozePasskeyPrompts } from '../../utils/passkeySnooze';

const resetPassword = vi.fn();
const getMyProfile = vi.fn();
let webauthnSupported = true;

vi.mock('../../config/client', () => ({
  useApiClient: () => ({
    authApi: { resetPasswordApiV1AuthResetPost: resetPassword },
    usersApi: { getMyProfileApiV1ProfilesMeGet: getMyProfile },
  }),
  queryClient: { clear: vi.fn(), setQueryData: vi.fn() },
}));

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => webauthnSupported,
}));

// PasskeyEnrollment (rendered on the enroll step) pulls the registration hook.
vi.mock('../../utils/usePasskey', () => ({
  useRegisterPasskey: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import ChangePasswordPage from './changePassword';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/auth/reset/tok123']}>
      <Routes>
        <Route path="/auth/reset/:token" element={<ChangePasswordPage />} />
        <Route path="/" element={<div>home</div>} />
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
  window.localStorage.clear();
  webauthnSupported = true;
  vi.clearAllMocks();
});

describe('ChangePasswordPage', () => {
  it('offers passkey enrolment after a successful reset (auto-login)', async () => {
    resetPassword.mockResolvedValue('OK');
    getMyProfile.mockResolvedValue({ id: 'u1' });
    renderPage();
    fillAndSubmit();
    expect(await screen.findByText('Sécurisez votre compte')).toBeTruthy();
  });

  it('skips the passkey offer when snoozed and shows the signed-in success screen', async () => {
    resetPassword.mockResolvedValue('OK');
    getMyProfile.mockResolvedValue({ id: 'u1' });
    snoozePasskeyPrompts('u1');
    renderPage();
    fillAndSubmit();
    expect(await screen.findByText(/Mot de passe changé avec succès/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Accéder à mon espace/ })).toBeTruthy();
  });

  it('skips the passkey offer without WebAuthn support', async () => {
    webauthnSupported = false;
    resetPassword.mockResolvedValue('OK');
    getMyProfile.mockResolvedValue({ id: 'u1' });
    renderPage();
    fillAndSubmit();
    expect(await screen.findByText(/Mot de passe changé avec succès/)).toBeTruthy();
  });

  it('« Plus tard » snoozes the account and leaves for home', async () => {
    resetPassword.mockResolvedValue('OK');
    getMyProfile.mockResolvedValue({ id: 'u1' });
    renderPage();
    fillAndSubmit();
    fireEvent.click(await screen.findByRole('button', { name: 'Plus tard' }));
    expect(window.localStorage.getItem('bmr:passkey-snooze:u1')).toBeTruthy();
    expect(await screen.findByText('home')).toBeTruthy();
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
