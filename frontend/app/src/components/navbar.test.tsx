// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Permissions granted to the mocked user; tests flip `admin` to check gating.
const perms = vi.hoisted(() => ({ admin: true }));

// Mock the auth/permissions client so Navbar renders without a backend.
vi.mock('../config/client', () => ({
  usePermissions: () => ({
    can: (_action: string, resource: string) => (resource === 'admin' ? perms.admin : true),
  }),
  useUserProfile: () => ({
    id: '1', firstName: 'Jean', lastName: 'Test', pictureUrl: null,
  }),
  useAuth: () => ({
    logout: vi.fn(), login: vi.fn(), switchAccount: vi.fn(),
  }),
  useSessions: () => ({ data: [{ id: '1', firstName: 'Jean', lastName: 'Test', active: true }] }),
}));

// Navbar reads the resolved theme to pick a logo; the tests don't render a
// ThemeProvider, so stub the hook to a stable value.
vi.mock('../config/theme', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import Navbar from './navbar';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Navbar desktop active tab', () => {
  it('applies the active color to the link for the current route', () => {
    renderAt('/files');
    // Multiple "Fichiers" links exist (desktop + mobile). The active one
    // must carry the primary color class.
    const links = screen.getAllByRole('link', { name: 'Fichiers' });
    expect(links.some((link) => link.className.includes('text-primary'))).toBe(true);
  });

  it('does not mark a non-active tab as active', () => {
    renderAt('/files');
    const links = screen.getAllByRole('link', { name: 'Trombinoscope' });
    expect(links.every((link) => !link.className.includes('text-primary'))).toBe(true);
  });

  it('only marks home active on the exact root path (end matching)', () => {
    renderAt('/files');
    const home = screen.getAllByRole('link', { name: 'Accueil' });
    expect(home.every((link) => !link.className.includes('text-primary'))).toBe(true);
  });

  it('marks home active on the root path', () => {
    renderAt('/');
    const home = screen.getAllByRole('link', { name: 'Accueil' });
    expect(home.some((link) => link.className.includes('text-primary'))).toBe(true);
  });
});

describe('Navbar account menu', () => {
  it('offers the Administration entry to view:admin holders', () => {
    perms.admin = true;
    renderAt('/');
    fireEvent.click(screen.getAllByRole('button', { name: /Comptes - / })[0]);
    expect(screen.getByRole('menuitem', { name: 'Administration' })).toBeTruthy();
  });

  it('hides the Administration entry otherwise', () => {
    perms.admin = false;
    renderAt('/');
    fireEvent.click(screen.getAllByRole('button', { name: /Comptes - / })[0]);
    expect(screen.getByRole('menuitem', { name: 'Profil et paramètres' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'Administration' })).toBeNull();
  });
});
