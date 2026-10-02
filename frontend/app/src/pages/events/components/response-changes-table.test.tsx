// @vitest-environment jsdom
import { Costume, type Event, type ResponseChange } from 'bagad-client';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import ResponseChangesTable from './response-changes-table';

const EVENT: Event = {
  id: 42,
  title: 'Fête de la Bretagne',
  description: '',
  date: new Date('2026-02-01T00:00:00Z'),
  costume: Costume.None,
  category: 'sortie',
  isInDoodle: true,
};

function makeChange(overrides: Partial<ResponseChange> = {}): ResponseChange {
  return {
    id: 1,
    fromValue: true,
    toValue: false,
    changedAt: new Date('2026-01-15T18:30:00Z'),
    event: EVENT,
    user: { id: 'u1', firstName: 'Yann', lastName: 'Le Guen' },
    ...overrides,
  };
}

function renderTable(changes: ResponseChange[], showChange = false) {
  return render(
    <MemoryRouter>
      <ResponseChangesTable changes={changes} showChange={showChange} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('ResponseChangesTable', () => {
  it('renders each change with member and event (desktop + mobile)', () => {
    renderTable([makeChange()]);

    // The component renders both a desktop table and a mobile list (one hidden
    // by CSS), so member/event appear twice in the DOM.
    expect(screen.getAllByText('Yann Le Guen')).toHaveLength(2);
    expect(screen.getAllByText('Fête de la Bretagne')).toHaveLength(2);
  });

  it('links the member name to their profile', () => {
    renderTable([makeChange()]);

    const links = screen.getAllByRole('link', { name: /Yann Le Guen/ });
    expect(links[0].getAttribute('href')).toBe('/profile/u1');
  });

  it('hides the transition when showChange is false', () => {
    renderTable([makeChange()], false);

    expect(screen.queryByLabelText('Présent')).toBeNull();
    expect(screen.queryByLabelText('Absent')).toBeNull();
  });

  it('shows the transition icons when showChange is true', () => {
    renderTable([makeChange()], true);

    // Present -> Absent, once in the desktop table and once in the mobile list.
    expect(screen.getAllByLabelText('Présent')).toHaveLength(2);
    expect(screen.getAllByLabelText('Absent')).toHaveLength(2);
  });

  it('shows "Sans réponse" as the prior state when there was no answer', () => {
    renderTable([makeChange({ id: 2, fromValue: null, toValue: true })], true);

    expect(screen.getAllByLabelText('Sans réponse')).toHaveLength(2);
  });
});
