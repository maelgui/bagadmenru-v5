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

  it('falls back to "Inconnue" when no upload date is available', () => {
    render(<FileDetailsDialog file={makeFile({ uploadedAt: null })} onClose={vi.fn()} />);
    expect(screen.getByText('Inconnue')).toBeTruthy();
  });

  it('renders nothing when no file is provided', () => {
    render(<FileDetailsDialog file={undefined} onClose={vi.fn()} />);
    expect(screen.queryByText('Détails')).toBeNull();
  });
});
