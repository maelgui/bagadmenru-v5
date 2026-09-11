// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MembershipStatus, type Profile } from 'bagad-client';
import { applyFilters, deriveFilterOptions, flattenOptions } from './list';

// Minimal Profile factory: only the fields the filtering logic reads matter,
// the rest are filled with inert defaults to satisfy the type.
function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    id: 'id',
    firstName: 'First',
    lastName: 'Last',
    email: 'x@example.com',
    receivesEmails: true,
    receivesPush: true,
    isActive: true,
    pictureUrl: null,
    groups: [],
    ...overrides,
  };
}

// Instrument groups also appear inside `groups` server-side, so tests mirror
// that: a member's instrument is present both in `groups` (isInstrument: true)
// and in the dedicated `instrument` field.
const bombarde = { id: 10, name: 'Bombarde', isInstrument: true };
const cornemuse = { id: 11, name: 'Cornemuse', isInstrument: true };
const bureau = { id: 20, name: 'Bureau', isInstrument: false };
const anims = { id: 21, name: 'Animations', isInstrument: false };

const alice = makeProfile({
  id: 'alice',
  groups: [bombarde, bureau],
  instrument: bombarde,
  membershipStatus: MembershipStatus.Active,
});
const bob = makeProfile({
  id: 'bob',
  groups: [cornemuse, anims],
  instrument: cornemuse,
  membershipStatus: MembershipStatus.Expired,
});
const carol = makeProfile({
  id: 'carol',
  groups: [bombarde, anims],
  instrument: bombarde,
  membershipStatus: MembershipStatus.None,
});

const everyone = [alice, bob, carol];
const ids = (profiles: Profile[]) => profiles.map((p) => p.id);

// Resolve a criterion option from the unified option list by its label.
function opt(label: string) {
  const options = flattenOptions(deriveFilterOptions(everyone, true));
  const found = options.find((o) => o.label === label);
  if (!found) {
    throw new Error(`No option labelled "${label}"`);
  }
  return found;
}

describe('applyFilters', () => {
  it('returns everyone when nothing is selected', () => {
    expect(applyFilters(everyone, [])).toEqual(everyone);
  });

  it('filters by membership status', () => {
    expect(ids(applyFilters(everyone, [opt('À jour')]))).toEqual(['alice']);
    expect(ids(applyFilters(everyone, [opt('Sans adhésion')]))).toEqual(['carol']);
  });

  it('filters by group, excluding instrument groups', () => {
    expect(ids(applyFilters(everyone, [opt('Animations')]))).toEqual(['bob', 'carol']);
  });

  it('filters by instrument', () => {
    expect(ids(applyFilters(everyone, [opt('Bombarde')]))).toEqual(['alice', 'carol']);
  });

  it('uses OR within a dimension', () => {
    // Bombarde OR Cornemuse -> everyone plays one of them.
    expect(ids(applyFilters(everyone, [opt('Bombarde'), opt('Cornemuse')])))
      .toEqual(['alice', 'bob', 'carol']);
  });

  it('uses AND across dimensions', () => {
    // Instrument Bombarde AND group Animations -> only carol.
    expect(ids(applyFilters(everyone, [opt('Bombarde'), opt('Animations')]))).toEqual(['carol']);
    // Combined with membership: none + Animations + Bombarde -> carol.
    expect(ids(applyFilters(everyone, [opt('Sans adhésion'), opt('Animations'), opt('Bombarde')])))
      .toEqual(['carol']);
  });
});

describe('deriveFilterOptions', () => {
  it('builds labelled sections: Adhésion, Instruments, Groupes', () => {
    const sections = deriveFilterOptions(everyone, true);
    const labels = (items: Array<{ label: string }>) => items.map((o) => o.label);
    expect(sections.map((s) => s.label)).toEqual(['Adhésion', 'Instruments', 'Groupes']);
    expect(sections.map((s) => labels(s.items))).toEqual([
      // Membership (declaration order)
      ['À jour', 'Expirée', 'Sans adhésion'],
      // Instruments (sorted fr), de-duplicated (Bombarde appears twice)
      ['Bombarde', 'Cornemuse'],
      // Groups (sorted fr), instrument groups excluded
      ['Animations', 'Bureau'],
    ]);
  });

  it('omits the Adhésion section when membership is not available', () => {
    const sections = deriveFilterOptions(everyone, false);
    expect(sections.map((s) => s.label)).toEqual(['Instruments', 'Groupes']);
  });

  it('prefixes value by kind so ids never collide across dimensions', () => {
    const options = flattenOptions(deriveFilterOptions(everyone, true));
    const bombardeOpt = options.find((o) => o.label === 'Bombarde');
    expect(bombardeOpt?.value).toBe('instrument:10');
    expect(bombardeOpt?.kind).toBe('instrument');
  });
});
