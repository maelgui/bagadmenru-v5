// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

// A conditional-UI capable browser: exercises the passkey button branch so
// the login-link button is asserted alongside it, not just in the fallback.
let webauthnSupported = true;

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => webauthnSupported,
  startAuthentication: vi.fn(),
  WebAuthnError: class WebAuthnError extends Error {},
}));

vi.mock('../../config/client', () => ({
  useApiClient: () => ({
    authApi: { prepareLoginApiV1AuthLoginGet: vi.fn() },
    usersApi: {},
  }),
  queryClient: { clear: vi.fn(), setQueryData: vi.fn() },
}));

vi.mock('../../utils/usePasskey', () => ({
  attemptSilentPasskeyUpgrade: vi.fn(),
  browserSupportsConditionalGet: async () => await Promise.resolve(false),
  signalUnknownPasskey: vi.fn(),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import AuthPage from './login';

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('login page alternative sign-in methods', () => {
  afterEach(() => {
    webauthnSupported = true;
    cleanup();
  });

  it('always offers the email login-link fallback', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /lien de connexion/i });
    expect(link.getAttribute('href')).toBe('/auth/reset');
  });

  it('keeps the login-link fallback even without WebAuthn support', () => {
    webauthnSupported = false;
    renderPage();
    expect(screen.getByRole('link', { name: /lien de connexion/i })).toBeTruthy();
    // The passkey button must be hidden when the browser cannot do WebAuthn.
    expect(screen.queryByRole('button', { name: /clé d'accès/i })).toBeNull();
  });

  it('offers the passkey button when WebAuthn is supported', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /clé d'accès/i })).toBeTruthy();
  });
});
