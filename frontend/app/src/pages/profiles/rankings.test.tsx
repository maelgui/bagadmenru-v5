// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Profile, SeasonRanking, UserRankingItem } from 'bagad-client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { METRICS } from './rankings.helpers';
import { RankingsContent } from './rankings';

function profile(id: string, firstName: string): Profile {
  return {
    id,
    firstName,
    lastName: 'Test',
    email: `${id}@example.bzh`,
    groups: [],
    receivesEmails: true,
    receivesPush: true,
    isActive: true,
    pictureUrl: null,
  };
}

function item(id: string, firstName: string, rank: number): UserRankingItem {
  return {
    user: profile(id, firstName),
    ranks: {
      medianResponseTime: 'P1D',
      medianResponseTimeRank: rank,
      responseRate: 0.5,
      responseRateRank: rank,
      nPositiveResponses: 5,
      nPositiveResponsesRank: rank,
    },
  };
}

const windows: SeasonRanking[] = [
  {
    season: 2026,
    items: [item('u1', 'Awen', 1), item('u2', 'Nolwenn', 2)],
  },
];

afterEach(cleanup);

describe('Rankings metric description', () => {
  it('shows the description of the selected metric and updates on change', () => {
    render(
      <MemoryRouter>
        <RankingsContent windows={windows} />
      </MemoryRouter>,
    );

    const [reactivity, , attendance] = METRICS;

    // Reactivity is the default metric.
    expect(screen.getByText(reactivity.description)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: attendance.short }));
    expect(screen.getByText(attendance.description)).toBeTruthy();
    expect(screen.queryByText(reactivity.description)).toBeNull();
  });
});
