// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { type FileOrFolder, FileOrFolderType } from 'bagad-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileDetailsDialog from './file-details-dialog';

function makeFile(overrides: Partial<FileOrFolder> = {}): FileOrFolder {
  const base: FileOrFolder = {
    id: 1,
    name: 'photo.jpg',
    type: FileOrFolderType.File,
    parentId: 10,
    fileUrl: 'https://example.invalid/photo.jpg',
    downloadUrl: 'https://example.invalid/photo.jpg?download',
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
          size: 2048,
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
});
