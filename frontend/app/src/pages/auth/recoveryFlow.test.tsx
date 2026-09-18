// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { ResponseError } from 'bagad-client';
import {
  MemoryRouter, Route, Routes, useLocation,
} from 'react-router-dom';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

const requestReset = vi.fn();
const loginWithCode = vi.fn();
const getMyProfile = vi.fn();
const registerMutate = vi.fn();

vi.mock('../../config/client', () => ({
  useApiClient: () => ({
    authApi: {
      resetPasswordRequestApiV1AuthResetPasswordRequestPost: requestReset,
      loginWithCodeApiV1AuthLoginCodePost: loginWithCode,
    },
    usersApi: { getMyProfileApiV1ProfilesMeGet: getMyProfile },
  }),
  queryClient: { clear: vi.fn(), setQueryData: vi.fn() },
}));

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
}));

vi.mock('../../utils/passkeySnooze', () => ({
  isPasskeySnoozed: () => false,
  snoozePasskeyPrompts: vi.fn(),
}));

vi.mock('../../utils/usePasskey', () => ({
  useRegisterPasskey: () => ({
    mutate: registerMutate, isPending: false, isError: false,
  }),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import AuthNextPage from './next';
// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import GrantStep from './recovery/GrantStep';
// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import RequestStep from './recovery/RequestStep';

// Surfaces the in-memory location so tests can assert the consumed grant
// drops out of the URL after sign-in (reload must not replay a dead grant).
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderPage(initialEntry = '/auth/reset') {
  // The recovery components run their server calls through useMutation.
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/auth/reset">
            <Route index element={<RequestStep />} />
            <Route path=":grantId" element={<GrantStep />} />
          </Route>
          <Route path="/auth/next" element={<AuthNextPage />} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function requestEmail() {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'membre@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
  await waitFor(() => {
    expect(screen.getByText(/Un email vous a été envoyé/)).toBeTruthy();
  });
}

function typeCode(code: string) {
  // InputOTP renders a single hidden input driving the slots.
  fireEvent.change(screen.getByRole('textbox'), { target: { value: code } });
}

beforeEach(() => {
  requestReset.mockResolvedValue({ grantId: 'grant-abc' });
  loginWithCode.mockResolvedValue({ accessToken: 'jwt', tokenType: 'bearer' });
  // Default: a password account — lands on the chooser (passkey vs password).
  getMyProfile.mockResolvedValue({ id: 'acc-1', firstName: 'John', hasPassword: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Recovery flow', () => {
  it('offers an inline code entry once the email is sent', async () => {
    renderPage();
    await requestEmail();
    expect(requestReset).toHaveBeenCalledWith({
      resetPasswordRequest: { email: 'membre@example.com' },
    });
    expect(screen.getByText(/Vous avez reçu un code \?/)).toBeTruthy();
  });

  it('signs in with the code (against the request grant) then lands on the chooser', async () => {
    renderPage();
    await requestEmail();
    typeCode('123456');
    await waitFor(() => {
      expect(screen.getByText(/Comment voulez-vous vous reconnecter/)).toBeTruthy();
    });
    expect(loginWithCode).toHaveBeenCalledWith({
      loginCode: { grantId: 'grant-abc', code: '123456' },
    });
    // The consumed grant dropped out of the URL: the landing is /auth/next
    // with the one-shot context in navigation state.
    expect(screen.getByTestId('location').textContent).toBe('/auth/next');
  });

  it('shows a recoverable error on a rejected code', async () => {
    loginWithCode.mockRejectedValue(
      new ResponseError(new Response(null, { status: 403 }), 'Forbidden'),
    );
    renderPage();
    await requestEmail();
    typeCode('999999');
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Code incorrect ou expiré');
    });
    // Still on the code screen: the member can retry or request a new email.
    expect(screen.getByText(/Vous avez reçu un code \?/)).toBeTruthy();
  });

  it('signs in automatically when the URL carries the emailed grant+code link', async () => {
    renderPage('/auth/reset/grant-abc?code=123456');
    await waitFor(() => {
      expect(screen.getByText(/Comment voulez-vous vous reconnecter/)).toBeTruthy();
    });
    // The link is the same credential submitted once, labelled for the funnel.
    expect(loginWithCode).toHaveBeenCalledTimes(1);
    expect(loginWithCode).toHaveBeenCalledWith({
      loginCode: { grantId: 'grant-abc', code: '123456', via: 'link' },
    });
    expect(screen.getByTestId('location').textContent).toBe('/auth/next');
  });

  it('falls back to the code form with a recoverable error when the link grant is rejected', async () => {
    loginWithCode.mockRejectedValue(
      new ResponseError(new Response(null, { status: 403 }), 'Forbidden'),
    );
    renderPage('/auth/reset/grant-dead?code=000000');
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Code incorrect ou expiré');
    });
    // The dead link lands on the same code form: retype or request anew.
    expect(loginWithCode).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'demandez un nouvel email' })).toBeTruthy();
  });

  it('takes a passkey-only account straight to the passkey offer (no chooser)', async () => {
    getMyProfile.mockResolvedValue({ id: 'acc-1', firstName: 'John', hasPassword: false });
    renderPage();
    await requestEmail();
    typeCode('123456');
    await waitFor(() => {
      expect(screen.getByText('Créez une clé d\'accès')).toBeTruthy();
    });
    expect(screen.queryByText(/Comment voulez-vous vous reconnecter/)).toBeNull();
  });

  it('lets a password account choose to set a new password', async () => {
    renderPage();
    await requestEmail();
    typeCode('123456');
    await waitFor(() => {
      expect(screen.getByText(/Comment voulez-vous vous reconnecter/)).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Définir un nouveau mot de passe'));
    await waitFor(() => {
      expect(screen.getByText('Nouveau mot de passe')).toBeTruthy();
    });
    // Back returns to the chooser (the choice is not addressable).
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByText(/Comment voulez-vous vous reconnecter/)).toBeTruthy();
  });
});
