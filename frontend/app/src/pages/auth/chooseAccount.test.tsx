// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

const switchAccount = vi.fn();
const sessions = [
  { id: 'a', firstName: 'Alice', lastName: 'Bee', active: false },
  { id: 'b', firstName: 'Bob', lastName: 'Cee', active: false },
];

vi.mock('../../config/client', () => ({
  useAuth: () => ({ switchAccount }),
  useSessions: () => ({ data: sessions, isPending: false }),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import ChooseAccountPage from './chooseAccount';

function renderPage() {
  return render(
    <MemoryRouter>
      <ChooseAccountPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ChooseAccountPage', () => {
  it('lists the remaining accounts', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Alice Bee/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bob Cee/ })).toBeTruthy();
  });

  it('switches to the picked account', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Bob Cee/ }));
    expect(switchAccount).toHaveBeenCalledWith('b');
  });
});
