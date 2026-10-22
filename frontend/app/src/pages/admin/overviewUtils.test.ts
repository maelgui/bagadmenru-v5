import type { AdminMember, Group } from 'bagad-client';
import { MembershipStatus } from 'bagad-client';
import { describe, expect, it } from 'vitest';
import { buildOverview, plural } from './overviewUtils';

function member(overrides: Partial<AdminMember> = {}): AdminMember {
  return {
    id: 'u',
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.c',
    isActive: true,
    receivesEmails: true,
    hasPassword: true,
    passkeyCount: 0,
    pushSubscriptionCount: 0,
    apiKeyCount: 0,
    membershipStatus: MembershipStatus.None,
    membershipActiveSeason: null,
    instrument: null,
    groups: [],
    ...overrides,
  };
}

function group(overrides: Partial<Group> = {}): Group {
  return {
    id: 1, name: 'G', color: '#000', isInstrument: false, mailingList: null, roles: [], members: [], ...overrides,
  };
}

describe('buildOverview', () => {
  it('counts only active members for posture metrics, all members for API keys', () => {
    const members = [
      member({ id: '1', membershipStatus: MembershipStatus.Active, pushSubscriptionCount: 2, apiKeyCount: 1 }),
      member({ id: '2', hasPassword: false }),
      member({ id: '3', isActive: false, hasPassword: false, apiKeyCount: 1 }),
    ];
    const overview = buildOverview(members, [], 0);

    expect(overview.membersActive).toBe(2);
    expect(overview.membersInactive).toBe(1);
    expect(overview.membershipsActive).toBe(1);
    expect(overview.pushDevices).toBe(2);
    expect(overview.membersWithPush).toBe(1);
    expect(overview.apiKeys).toBe(2);
    expect(overview.alerts.map((a) => a.key)).toEqual(['credentials']);
    expect(overview.alerts[0].title).toBe('1 membre sans identifiant');
  });

  it('raises unlinked and mailing-list alerts', () => {
    const overview = buildOverview([], [group({ mailingListSyncError: 'boom' }), group()], 3);
    expect(overview.alerts.map((a) => a.key)).toEqual(['unlinked', 'mailing']);
    expect(overview.alerts[0].title).toBe('3 adhésions à rattacher');
    expect(overview.alerts[1].title).toBe('1 mailing list en erreur');
  });

  it('has no alert when everything is healthy', () => {
    expect(buildOverview([member()], [group()], 0).alerts).toEqual([]);
  });
});

describe('plural', () => {
  it('handles regular and irregular forms', () => {
    expect(plural(1, 'membre')).toBe('1 membre');
    expect(plural(2, 'membre')).toBe('2 membres');
    expect(plural(2, 'mailing list')).toBe('2 mailing lists');
    expect(plural(0, 'inactif')).toBe('0 inactif');
  });
});
