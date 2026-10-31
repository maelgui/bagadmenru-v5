import { describe, expect, it } from 'vitest';
import {
  matchPages, normalize, pageTitle, SEARCHABLE_PAGES, tokens,
} from './pages';

const allow = () => true;
const deny = () => false;

describe('normalize / tokens', () => {
  it('strips accents and case', () => {
    expect(normalize('Évènements à Loudéac')).toBe('evenements a loudeac');
  });

  it('splits on whitespace and drops empty tokens', () => {
    expect(tokens('  trombi   noscope ')).toEqual(['trombi', 'noscope']);
    expect(tokens('   ')).toEqual([]);
  });
});

describe('matchPages', () => {
  it('returns nothing for a blank query', () => {
    expect(matchPages('', allow)).toEqual([]);
  });

  it('matches accent-insensitively on label, section and keywords', () => {
    expect(matchPages('evenement', allow).map((page) => page.label)).toContain('Gestion des évènements');
    expect(matchPages('annuaire', allow).map((page) => page.to)).toEqual(['/profile']);
    expect(matchPages('administration', allow).every((page) => page.to.startsWith('/admin'))).toBe(true);
  });

  it('requires every token to match', () => {
    expect(matchPages('sécurité admin', allow).map((page) => page.to)).toEqual(['/admin/security']);
  });

  it('ranks label prefix matches first and caps the list', () => {
    const hits = matchPages('a', allow, 3);
    expect(hits).toHaveLength(3);
    expect(hits.map((page) => page.label)).toEqual(['Accueil', 'Ajouter un évènement', 'Apparence']);
  });

  it('hides pages the member may not open', () => {
    const can = (action: string, resource: string) => `${action}:${resource}` === 'view:file';
    const hits = matchPages('a', can, 50);
    expect(hits.map((page) => page.to)).toContain('/files');
    expect(hits.map((page) => page.to)).toContain('/profile/settings/security');
    expect(hits.every((page) => !page.permission || page.permission.join(':') === 'view:file')).toBe(true);
    expect(matchPages('admin', deny)).toEqual([]);
  });

  it('every page has a unique route', () => {
    const routes = SEARCHABLE_PAGES.map((page) => page.to);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('prefixes the label with its section', () => {
    expect(pageTitle({ label: 'Sécurité', section: 'Paramètres', to: '/x', icon: SEARCHABLE_PAGES[0].icon })).toBe('Paramètres · Sécurité');
    expect(pageTitle(SEARCHABLE_PAGES[0])).toBe('Accueil');
  });
});
