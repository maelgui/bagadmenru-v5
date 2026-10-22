import { describe, expect, it } from 'vitest';
import { isAction, permissionLabel, resourceLabel, splitPermission } from './permissions';

describe('permissionLabel', () => {
  it('keeps the established wording for known permissions', () => {
    expect(permissionLabel('view:calendar')).toBe('Synchroniser le calendrier (ICS)');
  });

  it('composes action and resource otherwise', () => {
    expect(permissionLabel('delete:group')).toBe('Supprimer · Groupes');
    expect(permissionLabel('view:admin')).toBe('Voir · Administration');
  });

  it('falls back to the raw string for unknown shapes', () => {
    expect(permissionLabel('fly:group')).toBe('fly:group');
    expect(permissionLabel('edit:spaceship')).toBe('Modifier · spaceship');
  });
});

describe('helpers', () => {
  it('splits and labels', () => {
    expect(splitPermission('edit:file')).toEqual({ action: 'edit', resource: 'file' });
    expect(splitPermission('broken')).toEqual({ action: 'broken', resource: '' });
    expect(resourceLabel('file')).toBe('Fichiers');
    expect(resourceLabel('unknown')).toBe('unknown');
    expect(isAction('view')).toBe(true);
    expect(isAction('fly')).toBe(false);
  });
});
