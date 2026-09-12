// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

const mutate = vi.fn();
// Reassigned per test to simulate the mutation states.
let mutationState: { mutate: typeof mutate, isPending: boolean, isError: boolean } = {
  mutate, isPending: false, isError: false,
};

vi.mock('../../utils/usePasskey', () => ({
  useRegisterPasskey: () => mutationState,
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import PasskeyEnrollment from './PasskeyEnrollment';

beforeEach(() => {
  mutationState = { mutate, isPending: false, isError: false };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PasskeyEnrollment', () => {
  it('offers a skip escape hatch when onSkip is provided', () => {
    const onSkip = vi.fn();
    render(<PasskeyEnrollment onEnrolled={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(onSkip).toHaveBeenCalled();
  });

  it('hides the skip button when onSkip is not provided', () => {
    render(<PasskeyEnrollment onEnrolled={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Plus tard' })).toBeNull();
  });

  it('surfaces enrollment failures instead of failing silently', () => {
    // Regression: a failed WebAuthn ceremony used to leave the screen unchanged.
    mutationState = { mutate, isPending: false, isError: true };
    render(<PasskeyEnrollment onEnrolled={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/La création de la clé d'accès a échoué/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Réessayer/ })).toBeTruthy();
  });
});
