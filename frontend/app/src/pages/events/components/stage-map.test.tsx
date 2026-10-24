// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import StageMap, { type StageMember, zoneForName } from './stage-map';

afterEach(cleanup);

describe('zoneForName', () => {
  it('maps the bombardes family to the left', () => {
    expect(zoneForName('Bombardes')).toBe('left');
    expect(zoneForName('Talabarder')).toBe('left');
  });

  it('maps the batterie family to the center', () => {
    expect(zoneForName('Batterie')).toBe('center');
    expect(zoneForName('Caisses claires')).toBe('center');
    expect(zoneForName('Percussions')).toBe('center');
  });

  it('maps the cornemuses family to the right', () => {
    expect(zoneForName('Cornemuses')).toBe('right');
    expect(zoneForName('Biniou')).toBe('right');
    expect(zoneForName('Pibien')).toBe('right');
  });

  it('is accent and case insensitive', () => {
    expect(zoneForName('BOMBARDE')).toBe('left');
    expect(zoneForName('Côrnemuse')).toBe('right');
  });

  it('falls back to the other zone for an unknown section', () => {
    expect(zoneForName('Chorale')).toBe('other');
    expect(zoneForName('')).toBe('other');
  });
});

describe('StageMap', () => {
  const member = (overrides: Partial<StageMember>): StageMember => ({
    id: 'm',
    name: 'Alice Martin',
    color: '#b01030',
    sectionName: 'Bombardes',
    state: 'present',
    ...overrides,
  });

  it('renders nothing when there are no members', () => {
    const { container } = render(<StageMap members={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('labels each member with its name and attendance state', () => {
    render(
      <StageMap
        members={[
          member({ id: '1', name: 'Alice Martin', state: 'present' }),
          member({ id: '2', name: 'Bob Le Gall', state: 'absent' }),
          member({ id: '3', name: 'Chloé Riou', state: 'unknown' }),
        ]}
      />,
    );

    expect(screen.getByLabelText('Alice Martin - présent')).toBeTruthy();
    expect(screen.getByLabelText('Bob Le Gall - absent')).toBeTruthy();
    expect(screen.getByLabelText('Chloé Riou - sans réponse')).toBeTruthy();
  });
});
