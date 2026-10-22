// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const permissionsMock = vi.fn<() => { permissions: string[] | undefined; can: (a: string, r: string) => boolean }>();

vi.mock('../config/client', () => ({
  usePermissions: () => permissionsMock(),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import AdminGuard from './admin';

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/" element={<p>Accueil</p>} />
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<p>Espace admin</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminGuard', () => {
  it('shows a loading state until permissions are known', () => {
    permissionsMock.mockReturnValue({ permissions: undefined, can: () => false });
    renderGuard();
    expect(screen.getByRole('status').textContent).toContain('Chargement');
    expect(screen.queryByText('Espace admin')).toBeNull();
  });

  it('renders the admin area for view:admin holders', () => {
    permissionsMock.mockReturnValue({ permissions: ['view:admin'], can: (a, r) => `${a}:${r}` === 'view:admin' });
    renderGuard();
    expect(screen.getByText('Espace admin')).toBeTruthy();
  });

  it('redirects everyone else to home', () => {
    permissionsMock.mockReturnValue({ permissions: ['view:event'], can: () => false });
    renderGuard();
    expect(screen.getByText('Accueil')).toBeTruthy();
    expect(screen.queryByText('Espace admin')).toBeNull();
  });
});
