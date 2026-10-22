import type { AdminMember } from 'bagad-client';
import { MembershipStatus } from 'bagad-client';
import { describe, expect, it } from 'vitest';
import {
  hasCredential,
  isFilter,
  matchesFilter,
  matchesSearch,
  membersToCsv,
} from './memberUtils';

function member(overrides: Partial<AdminMember> = {}): AdminMember {
  return {
    id: 'u1',
    firstName: 'Anna',
    lastName: 'Le Goff',
    email: 'anna@example.com',
    isActive: true,
    receivesEmails: true,
    hasPassword: false,
    passkeyCount: 0,
    pushSubscriptionCount: 0,
    apiKeyCount: 0,
    membershipStatus: MembershipStatus.None,
    membershipActiveSeason: null,
    instrument: { id: 1, name: 'Bombarde', color: '#000', isInstrument: true },
    groups: [{ id: 2, name: 'Bureau; direction', color: '#fff', isInstrument: false }],
    ...overrides,
  };
}

describe('hasCredential', () => {
  it('is true with a password or a passkey only', () => {
    expect(hasCredential(member())).toBe(false);
    expect(hasCredential(member({ hasPassword: true }))).toBe(true);
    expect(hasCredential(member({ passkeyCount: 1 }))).toBe(true);
  });
});

describe('matchesFilter', () => {
  it('inactive keeps only inactive accounts', () => {
    expect(matchesFilter(member({ isActive: false }), 'inactive')).toBe(true);
    expect(matchesFilter(member(), 'inactive')).toBe(false);
  });

  it('no-credential and no-membership ignore inactive accounts', () => {
    expect(matchesFilter(member(), 'no-credential')).toBe(true);
    expect(matchesFilter(member({ isActive: false }), 'no-credential')).toBe(false);
    expect(matchesFilter(member({ membershipStatus: MembershipStatus.Expired }), 'no-membership')).toBe(true);
    expect(matchesFilter(member({ membershipStatus: MembershipStatus.Active }), 'no-membership')).toBe(false);
  });

  it('no-email keeps unsubscribed active members', () => {
    expect(matchesFilter(member({ receivesEmails: false }), 'no-email')).toBe(true);
    expect(matchesFilter(member(), 'no-email')).toBe(false);
  });

  it('all keeps everyone', () => {
    expect(matchesFilter(member({ isActive: false }), 'all')).toBe(true);
  });
});

describe('matchesSearch', () => {
  it('matches on name and email, case-insensitively', () => {
    expect(matchesSearch(member(), 'le goff')).toBe(true);
    expect(matchesSearch(member(), 'ANNA@')).toBe(true);
    expect(matchesSearch(member(), 'zoe')).toBe(false);
    expect(matchesSearch(member(), '   ')).toBe(true);
  });
});

describe('isFilter', () => {
  it('accepts known filters only', () => {
    expect(isFilter('inactive')).toBe(true);
    expect(isFilter('bogus')).toBe(false);
    expect(isFilter(undefined)).toBe(false);
  });
});

describe('membersToCsv', () => {
  it('writes a header and quotes fields containing the separator', () => {
    const csv = membersToCsv([member({ passkeyCount: 2 })]);
    const [header, row] = csv.split('\n');
    expect(header.startsWith('Prénom;Nom;E-mail;Pupitre;Groupes')).toBe(true);
    expect(row).toContain('"Bureau; direction"');
    expect(row).toContain(';Bombarde;');
    expect(row.endsWith(';non;2;0;0')).toBe(true);
  });
});
