// @vitest-environment jsdom
import {
  cleanup, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Costume, FileOrFolderType, type SearchResults } from 'bagad-client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

const search = vi.hoisted(() => vi.fn<() => Promise<SearchResults>>());

vi.mock('../../config/client', () => ({
  useApiClient: () => ({ searchApi: { searchApiV1SearchGet: search } }),
  usePermissions: () => ({ can: () => true }),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import GlobalSearch from './global-search';

// cmdk measures its list with ResizeObserver and scrolls the selected item
// into view; jsdom implements neither.
vi.stubGlobal('ResizeObserver', class {
  observe = vi.fn();

  unobserve = vi.fn();

  disconnect = vi.fn();
});
Element.prototype.scrollIntoView = vi.fn();

const RESULTS: SearchResults = {
  events: [{
    id: 7, title: 'Fête de la Saint-Yves', description: 'Défilé', date: new Date(2026, 4, 19), costume: Costume.None, category: 'sortie', isInDoodle: true,
  }],
  profiles: [{
    id: 'u1', firstName: 'Maël', lastName: 'Guillou', email: 'm@example.com', groups: [], isActive: true, receivesEmails: true, receivesPush: true, pictureUrl: null, instrument: { id: 1, name: 'Bombarde', color: '#f00' },
  }],
  files: [
    { file: { id: 42, name: 'Suite de Loudéac.pdf', type: FileOrFolderType.File, fileKey: 'k' }, path: ['Partitions', 'Bombarde'] },
    { file: { id: 43, name: 'Bombarde', type: FileOrFolderType.Dir }, path: ['Partitions'] },
  ],
};

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <GlobalSearch />
        <Routes>
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openAndType(text: string) {
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  const input = await screen.findByPlaceholderText('Pages, évènements, membres, fichiers…');
  fireEvent.change(input, { target: { value: text } });
  return input;
}

beforeEach(() => {
  search.mockResolvedValue(RESULTS);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('GlobalSearch', () => {
  it('opens with Ctrl+K and asks for at least two characters', async () => {
    renderSearch();
    expect(screen.queryByPlaceholderText('Pages, évènements, membres, fichiers…')).toBeNull();
    await openAndType('');
    expect(screen.getByText('Tapez au moins deux caractères pour rechercher.')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Pages, évènements, membres, fichiers…'), { target: { value: 'z' } });
    await waitFor(() => expect(screen.getByText('Tapez au moins deux caractères pour rechercher.')).toBeTruthy());
    expect(search).not.toHaveBeenCalled();
  });

  it('shows pages immediately and the backend results grouped by kind', async () => {
    renderSearch();
    await openAndType('loudeac');
    await waitFor(() => expect(search).toHaveBeenCalledWith({ q: 'loudeac' }));
    expect(await screen.findByText('Fichiers / Partitions / Bombarde')).toBeTruthy();
    expect(screen.getByText('Fête de la Saint-Yves')).toBeTruthy();
    expect(screen.getByText('Maël Guillou')).toBeTruthy();
    expect(screen.getByText('Évènements')).toBeTruthy();
    expect(screen.getByText('Membres')).toBeTruthy();
  });

  it('lists matching pages without calling the backend for them', async () => {
    renderSearch();
    await openAndType('trombi');
    expect(screen.getByText('Trombinoscope')).toBeTruthy();
  });

  it('navigates to the selected event and closes', async () => {
    renderSearch();
    await openAndType('fete');
    const item = await screen.findByText('Fête de la Saint-Yves');
    fireEvent.click(item);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/events/7'));
    expect(screen.queryByPlaceholderText('Pages, évènements, membres, fichiers…')).toBeNull();
  });

  it('opens a file in a new tab and navigates into a folder', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderSearch();
    await openAndType('bombarde');
    fireEvent.click(await screen.findByText('Suite de Loudéac.pdf'));
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/files\/42\/view$/), '_blank', 'noopener,noreferrer');

    await openAndType('bombarde');
    fireEvent.click(await screen.findByText('Fichiers / Partitions'));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/files/43'));
  });

  it('tells when nothing matches', async () => {
    search.mockResolvedValue({ events: [], profiles: [], files: [] });
    renderSearch();
    await openAndType('zzzz');
    expect(await screen.findByText('Aucun résultat pour « zzzz »')).toBeTruthy();
  });
});
