// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { ResponseError } from 'bagad-client';

import { destinationAfterSwitch, toastTitleForQueryError } from './client';

describe('toastTitleForQueryError', () => {
  const httpError = (status: number) => new ResponseError(new Response(null, { status }));

  it('stays silent on 401 (the auth guard already redirects to login)', () => {
    expect(toastTitleForQueryError(httpError(401))).toBeNull();
  });

  it('explains a 403', () => {
    expect(toastTitleForQueryError(httpError(403)))
      .toBe("Vous n'avez pas les droits nécessaires pour accéder à cette ressource.");
  });

  it('reports any other error with its message', () => {
    expect(toastTitleForQueryError(new Error('boom'))).toBe('Something went wrong: boom');
    expect(toastTitleForQueryError(httpError(500))).toMatch(/Something went wrong/);
  });
});

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
