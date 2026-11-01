// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { describeClickTarget, routePattern } from './audit-dom';

function render(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

describe('describeClickTarget', () => {
  it('names a button by its text', () => {
    const body = render('<button><svg></svg> Enregistrer </button>');
    const d = describeClickTarget(body.querySelector('svg'));
    expect(d).toEqual({ name: 'Enregistrer', details: { tag: 'button' } });
  });

  it('prefers aria-label, then data-audit over everything', () => {
    const body = render('<button aria-label="Révoquer la clé x">Révoquer</button>');
    expect(describeClickTarget(body.querySelector('button'))?.name).toBe('Révoquer la clé x');

    render('<button data-audit="events.rsvp.yes" aria-label="Oui pour Fest-noz">Oui</button>');
    const d = describeClickTarget(document.querySelector('button'));
    expect(d?.name).toBe('events.rsvp.yes');
    expect(d?.details).toEqual({ tag: 'button', label: 'Oui pour Fest-noz' });
  });

  it('describes links with their href and role-based widgets', () => {
    const body = render('<a href="/profile/42">Marie</a><div role="menuitem">Supprimer</div>');
    expect(describeClickTarget(body.querySelector('a'))).toEqual({
      name: 'Marie',
      details: { tag: 'a', href: '/profile/42' },
    });
    expect(describeClickTarget(body.querySelector('[role=menuitem]'))).toEqual({
      name: 'Supprimer',
      details: { tag: 'div', role: 'menuitem' },
    });
  });

  it('falls back to the tag for an unlabelled control and never reads input values', () => {
    const body = render('<button></button><input type="text" value="secret">');
    expect(describeClickTarget(body.querySelector('button'))?.name).toBe('button');
    expect(describeClickTarget(body.querySelector('input'))).toBeNull();
  });

  it('ignores clicks outside interactive elements', () => {
    const body = render('<p>Texte</p>');
    expect(describeClickTarget(body.querySelector('p'))).toBeNull();
    expect(describeClickTarget(null)).toBeNull();
  });

  it('clips long labels', () => {
    const body = render(`<button>${'x'.repeat(200)}</button>`);
    expect(describeClickTarget(body.querySelector('button'))?.name).toHaveLength(80);
  });
});

describe('routePattern', () => {
  it('replaces param segments with their names', () => {
    expect(routePattern('/profile/abc', { profileId: 'abc' })).toBe('/profile/:profileId');
    expect(routePattern('/events/edit/12', { eventId: '12' })).toBe('/events/edit/:eventId');
  });

  it('leaves static paths and unmatched optional params alone', () => {
    expect(routePattern('/files', { folderId: undefined })).toBe('/files');
    expect(routePattern('/admin/overview', {})).toBe('/admin/overview');
  });

  it('only matches whole segments', () => {
    expect(routePattern('/v1/events/1', { eventId: '1' })).toBe('/v1/events/:eventId');
  });

  it('decodes encoded segments before matching', () => {
    expect(routePattern('/groups/a%20b', { groupId: 'a b' })).toBe('/groups/:groupId');
  });
});
