// @vitest-environment jsdom
import {
  cleanup, fireEvent, render, screen,
} from '@testing-library/react';
import {
  afterEach, beforeAll, describe, expect, it, vi,
} from 'vitest';
import Checkbox from './checkbox';

beforeAll(() => {
  // jsdom has no PointerEvent constructor; Base UI dispatches one on click.
  if (typeof window.PointerEvent === 'undefined') {
    Object.defineProperty(window, 'PointerEvent', { value: MouseEvent, writable: true });
  }
});

function renderCell(value: boolean | undefined, onClick = vi.fn()) {
  render(
    <table>
      <tbody>
        <tr>
          <Checkbox value={value} onClick={onClick} />
        </tr>
      </tbody>
    </table>,
  );
  return onClick;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Doodle Checkbox (edit mode)', () => {
  it('renders an empty checkbox when the user has never answered', () => {
    renderCell(undefined);
    const checkbox = screen.getByRole('checkbox', { name: 'Modifier la réponse' });
    // Never answered: the checkbox must be truly empty — no "?" or any icon.
    expect(checkbox.querySelector('svg')).toBeNull();
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
  });

  it('renders a cross once the user answered "no"', () => {
    renderCell(false);
    const checkbox = screen.getByRole('checkbox', { name: 'Modifier la réponse' });
    expect(checkbox.querySelector('svg')).not.toBeNull();
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
  });

  it('renders a tick once the user answered "yes"', () => {
    renderCell(true);
    const checkbox = screen.getByRole('checkbox', { name: 'Modifier la réponse' });
    expect(checkbox.getAttribute('aria-checked')).toBe('true');
  });

  it('forwards clicks so the response alternates and never returns to empty', () => {
    const onClick = renderCell(false);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Modifier la réponse' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
