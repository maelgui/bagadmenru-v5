// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type FileOrFolder, FileOrFolderType } from 'bagad-client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileItem from './file-item';

function makeFile(overrides: Partial<FileOrFolder> = {}): FileOrFolder {
  const base: FileOrFolder = {
    id: 1,
    name: 'photo.jpg',
    type: FileOrFolderType.File,
    parentId: 10,
    fileUrl: 'https://example.invalid/photo.jpg',
    downloadUrl: 'https://example.invalid/photo.jpg?download',
  };
  return { ...base, ...overrides };
}

function makeFolder(overrides: Partial<FileOrFolder> = {}): FileOrFolder {
  return makeFile({
    name: 'Partitions',
    type: FileOrFolderType.Dir,
    fileUrl: null,
    downloadUrl: null,
    ...overrides,
  });
}

function renderItem(node: React.ReactElement) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

function openMenu(fileName: string) {
  fireEvent.click(screen.getByRole('button', { name: `Actions pour ${fileName}` }));
}

afterEach(cleanup);

describe('FileItem action menu permission gating', () => {
  it('shows rename and delete when both callbacks are provided', () => {
    renderItem(<FileItem file={makeFolder()} renameFn={vi.fn()} deleteFn={vi.fn()} />);
    openMenu('Partitions');
    expect(screen.getByRole('menuitem', { name: 'Renommer...' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Supprimer...' })).toBeTruthy();
  });

  it('hides rename when no rename callback is provided (no edit:file)', () => {
    renderItem(<FileItem file={makeFolder()} deleteFn={vi.fn()} />);
    openMenu('Partitions');
    expect(screen.queryByRole('menuitem', { name: 'Renommer...' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Supprimer...' })).toBeTruthy();
  });

  it('hides delete when no delete callback is provided (no delete:file)', () => {
    renderItem(<FileItem file={makeFolder()} renameFn={vi.fn()} />);
    openMenu('Partitions');
    expect(screen.getByRole('menuitem', { name: 'Renommer...' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'Supprimer...' })).toBeNull();
  });

  it('hides the menu trigger entirely on a folder with no available action', () => {
    renderItem(<FileItem file={makeFolder()} />);
    expect(screen.queryByRole('button', { name: 'Actions pour Partitions' })).toBeNull();
  });

  it('keeps only the download entry on a file when no mutation is allowed', () => {
    renderItem(<FileItem file={makeFile()} />);
    openMenu('photo.jpg');
    expect(screen.getByRole('menuitem', { name: 'Télécharger' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'Renommer...' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Supprimer...' })).toBeNull();
  });
});
