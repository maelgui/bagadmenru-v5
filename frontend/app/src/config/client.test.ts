// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { destinationAfterSwitch } from './client';

describe('destinationAfterSwitch', () => {
  it('keeps generic pages after an account switch', () => {
    expect(destinationAfterSwitch('/')).toBe('/');
    expect(destinationAfterSwitch('/events')).toBe('/events');
    expect(destinationAfterSwitch('/files')).toBe('/files');
    // The trombinoscope list is not resource-scoped.
    expect(destinationAfterSwitch('/profile')).toBe('/profile');
  });

  it('falls back to home on resource-scoped routes', () => {
    // A specific member sheet.
    expect(destinationAfterSwitch('/profile/abc123')).toBe('/');
    // Edit / settings screens tied to the active account.
    expect(destinationAfterSwitch('/profile/edit/abc123')).toBe('/');
    expect(destinationAfterSwitch('/profile/settings/profile')).toBe('/');
  });

  it('redirects auth pages home (chooser/login must not reload themselves)', () => {
    expect(destinationAfterSwitch('/auth/choose')).toBe('/');
    expect(destinationAfterSwitch('/auth/login')).toBe('/');
  });
});
