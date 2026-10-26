// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { type FileOrFolder, FileOrFolderType, type FileVersion } from 'bagad-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileDetailsDialog from './file-details-dialog';

function makeFile(overrides: Partial<FileOrFolder> = {}): FileOrFolder {
  const base: FileOrFolder = {
    id: 1,
    name: 'photo.jpg',
    type: FileOrFolderType.File,
    parentId: 10,
    uploadedAt: new Date('2026-01-15T09:30:00Z'),
  };
  return { ...base, ...overrides };
}

afterEach(cleanup);

describe('FileDetailsDialog', () => {
  it('shows the file name, type and formatted upload date', () => {
    render(<FileDetailsDialog file={makeFile()} onClose={vi.fn()} />);
    expect(screen.getByText('photo.jpg')).toBeTruthy();
    expect(screen.getByText('Fichier')).toBeTruthy();
    expect(screen.getByText(/15 janvier 2026/)).toBeTruthy();
  });

  it('falls back to "Date inconnue" when no upload date is available', () => {
    render(<FileDetailsDialog file={makeFile({ uploadedAt: null })} onClose={vi.fn()} />);
    expect(screen.getByText('Date inconnue')).toBeTruthy();
  });

  it('shows the formatted size and the uploader name', () => {
    render(
      <FileDetailsDialog
        file={makeFile({
          currentVersion: { id: 1, number: 1, size: 2048, uploadedAt: new Date('2026-01-15T09:30:00Z') },
          uploader: { id: 'u1', firstName: 'Mael', lastName: 'Gui', name: 'Mael Gui' },
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('2.0 Ko')).toBeTruthy();
    expect(screen.getByText(/par Mael Gui/)).toBeTruthy();
  });

  it('shows the modification row only when a modification date is present', () => {
    const { rerender } = render(<FileDetailsDialog file={makeFile()} onClose={vi.fn()} />);
    expect(screen.queryByText('Modifié')).toBeNull();

    rerender(
      <FileDetailsDialog
        file={makeFile({
          modifiedAt: new Date('2026-02-20T14:00:00Z'),
          modifier: { id: 'u2', firstName: 'Yann', lastName: 'Le B', name: 'Yann Le B' },
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Modifié')).toBeTruthy();
    expect(screen.getByText(/20 février 2026/)).toBeTruthy();
    expect(screen.getByText(/par Yann Le B/)).toBeTruthy();
  });

  it('renders nothing when no file is provided', () => {
    render(<FileDetailsDialog file={undefined} onClose={vi.fn()} />);
    expect(screen.queryByText('Détails')).toBeNull();
  });

  it('hides the version history while the file has a single version', () => {
    const versions: FileVersion[] = [{ id: 1, number: 1, uploadedAt: new Date('2026-01-15T09:30:00Z') }];
    render(<FileDetailsDialog file={makeFile()} versions={versions} onClose={vi.fn()} />);
    expect(screen.queryByText('Versions')).toBeNull();
  });

  it('lists versions with a download link, the current badge and expired ones', () => {
    const versions: FileVersion[] = [
      {
        id: 3,
        number: 3,
        size: 2048,
        uploadedAt: new Date('2026-03-01T10:00:00Z'),
        uploader: { id: 'u1', firstName: 'Mael', lastName: 'Gui', name: 'Mael Gui' },
      },
      {
        id: 2, number: 2, uploadedAt: new Date('2026-02-01T10:00:00Z'), supersededAt: new Date('2026-03-01T10:00:00Z'),
      },
      {
        id: 1,
        number: 1,
        uploadedAt: new Date('2025-01-01T10:00:00Z'),
        supersededAt: new Date('2025-02-01T10:00:00Z'),
        purgedAt: new Date('2026-02-02T04:00:00Z'),
      },
    ];
    render(<FileDetailsDialog file={makeFile()} versions={versions} onClose={vi.fn()} />);

    expect(screen.getByText('Versions')).toBeTruthy();
    expect(screen.getAllByText('Actuelle')).toHaveLength(1);
    expect(screen.getByText(/1 mars 2026.*Mael Gui · 2\.0 Ko/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Télécharger la version 2' }).getAttribute('href'))
      .toMatch(/\/api\/v1\/files\/1\/versions\/2\/download$/);
    expect(screen.queryByRole('link', { name: 'Télécharger la version 1' })).toBeNull();
    expect(screen.getByText('Expirée')).toBeTruthy();
  });
});
