// @vitest-environment jsdom
import {
  cleanup, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import type { Response } from 'bagad-client';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { MyResponseBlock } from './planning';

function myResponse(value: boolean): Response {
  return {
    value, userId: 'user-1', eventId: 1, date: new Date('2026-09-17'),
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Planning MyResponseBlock', () => {
  it('closes edit mode once the new answer is saved', async () => {
    const { promise, resolve } = Promise.withResolvers<undefined>();
    const onAnswer = vi.fn(async () => await promise);
    render(<MyResponseBlock myResponse={myResponse(true)} isSaving={false} onAnswer={onAnswer} />);

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Je ne participe pas' }));
    expect(onAnswer).toHaveBeenCalledWith(false);

    resolve(undefined);
    // Edit mode collapses back to the read-only line as save confirmation.
    await screen.findByText('Vous serez présent');
    expect(screen.queryByRole('button', { name: 'Je participe' })).toBeNull();
  });

  it('stays in edit mode when saving fails', async () => {
    const onAnswer = vi.fn<() => Promise<unknown>>().mockRejectedValue(new Error('network down'));
    render(<MyResponseBlock myResponse={myResponse(true)} isSaving={false} onAnswer={onAnswer} />);

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Je ne participe pas' }));

    await waitFor(() => expect(onAnswer).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Je participe' })).toBeTruthy();
    expect(screen.queryByText('Vous serez présent')).toBeNull();
  });

  it('shows a spinner on the clicked answer while saving', () => {
    const onAnswer = vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined);
    const { rerender } = render(<MyResponseBlock myResponse={myResponse(true)} isSaving={false} onAnswer={onAnswer} />);

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    rerender(<MyResponseBlock myResponse={myResponse(true)} isSaving pendingValue={false} onAnswer={onAnswer} />);

    // The Spinner's own aria-label joins the accessible name while pending
    // (same behaviour as AlertDialogAction), hence the partial match.
    const noButton = screen.getByRole('button', { name: /Je ne participe pas/ });
    expect(noButton.querySelector('[data-slot="spinner"]')).not.toBeNull();
    const yesButton = screen.getByRole('button', { name: /Je participe$/ });
    expect(yesButton.querySelector('[data-slot="spinner"]')).toBeNull();
    expect(noButton).toHaveProperty('disabled', true);
    expect(yesButton).toHaveProperty('disabled', true);
  });
});
