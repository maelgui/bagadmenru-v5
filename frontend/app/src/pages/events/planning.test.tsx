// @vitest-environment jsdom
import {
  cleanup, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import type { Event, Response } from 'bagad-client';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { MyResponseBlock, ResponsesDialog } from './planning';

function myResponse(value: boolean): Response {
  return {
    value, userId: 'user-1', eventId: 1, date: new Date('2026-09-17'),
  };
}

function eventResponse(userId: string, value: boolean): Response {
  return {
    value, userId, eventId: 1, date: new Date('2026-09-17'),
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

describe('Planning ResponsesDialog', () => {
  const event: Event = {
    id: 1,
    title: 'Répétition',
    description: '',
    date: new Date('2026-09-17'),
    costume: 'NONE',
    category: 'Répétition',
    isInDoodle: true,
  };

  function renderDialog(responses: Response[], totalMembers: number) {
    render(
      <ResponsesDialog
        event={event}
        responses={responses}
        instruments={[]}
        profiles={[]}
        responseByInstrument={new Map()}
        totalMembers={totalMembers}
        open
        onOpenChange={vi.fn()}
      />,
    );
  }

  it('shows the present count and the response rate as prominent indicators', () => {
    renderDialog([
      eventResponse('user-1', true),
      eventResponse('user-2', true),
      eventResponse('user-3', false),
    ], 4);

    // 2 positive answers out of 3 responses, 4 members total.
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('présents')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('de réponses (3/4)')).toBeTruthy();
    expect(screen.getByLabelText('3 réponses sur 4 membres')).toBeTruthy();
  });

  it('handles the singular and an empty member list without dividing by zero', () => {
    renderDialog([eventResponse('user-1', true)], 0);

    expect(screen.getByText('présent')).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
  });
});
