// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlertDialogAction } from './alert-dialog';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AlertDialogAction pending state', () => {
  it('fires onClick when idle', () => {
    const onClick = vi.fn();
    render(<AlertDialogAction onClick={onClick}>Supprimer</AlertDialogAction>);
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button and shows a spinner while pending', () => {
    const onClick = vi.fn();
    render(
      <AlertDialogAction pending onClick={onClick}>Supprimer</AlertDialogAction>,
    );
    const button = screen.getByRole('button', { name: /Supprimer/ });
    expect(button).toHaveProperty('disabled', true);
    expect(button.querySelector('[data-slot="spinner"]')).not.toBeNull();

    // Repeated clicks while the mutation runs must not re-fire the action.
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('stays disabled when explicitly disabled even if not pending', () => {
    render(<AlertDialogAction disabled>Supprimer</AlertDialogAction>);
    expect(screen.getByRole('button', { name: 'Supprimer' }))
      .toHaveProperty('disabled', true);
  });
});
