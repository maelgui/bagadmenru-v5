import { type FileOrFolder, FileOrFolderType } from 'bagad-client';
import env from '@/env';

const base = () => env.VITE_BBE2_API_URL || '';

export function fileViewUrl(fileId: number): string {
  return `${base()}/api/v1/files/${fileId}/view`;
}

export function fileDownloadUrl(fileId: number): string {
  return `${base()}/api/v1/files/${fileId}/download`;
}

// A file can be opened in the browser once its content has been stored.
export function isViewable(file: Pick<FileOrFolder, 'type' | 'fileKey'>): boolean {
  return file.type === FileOrFolderType.File && !!file.fileKey;
}
